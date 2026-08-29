import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_LOCK = Object.freeze({
  bytes: 23085972,
  sha256: '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d',
  scenes: 1,
  nodes: 1784,
  meshes: 348,
  triangles: 325358,
  materials: 30,
  images: 18,
  animations: 1,
  animationChannels: 2518,
  animationSamplers: 2518,
  accessors: 6702,
  bufferViews: 24
});

function parseArgs(argv) {
  const args = new Map();
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const equals = token.indexOf('=');
    if (equals >= 0) args.set(token.slice(0, equals), token.slice(equals + 1));
    else if (argv[index + 1] && !argv[index + 1].startsWith('--')) args.set(token, argv[++index]);
    else args.set(token, true);
  }
  return args;
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const args = parseArgs(process.argv);
const contractPath = String(args.get('--contract') || 'data/b24-native/reference-mirror-contract.json');
const mirrorDir = args.get('--mirror-dir') ? String(args.get('--mirror-dir')) : null;
const contract = JSON.parse(await readFile(contractPath, 'utf8'));
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(contract.schema === 'haihao.aircraft/reference-mirror-contract@1.0.0', 'Unexpected reference mirror contract schema.');
assert(contract.source_lock?.bytes === SOURCE_LOCK.bytes, 'Contract byte lock mismatch.');
assert(contract.source_lock?.sha256 === SOURCE_LOCK.sha256, 'Contract SHA-256 lock mismatch.');
assert(contract.authority?.upstream_controller === 'ChatGPT', 'Upstream analysis authority must remain ChatGPT.');
assert(contract.authority?.img2threejs_analysis_authority === false, 'img2threejs must not receive analysis authority.');
assert(contract.no_guess_policy?.unclassified_by_default === true, 'Unclassified-by-default policy is required.');
assert(contract.no_guess_policy?.automatic_geometry_substitution === false, 'Automatic geometry substitution must remain disabled.');
assert(contract.approvals?.exact_replay_runtime_approved === false, 'Exact replay cannot be pre-approved.');
assert(contract.approvals?.visual_parity_approved === false, 'Visual parity cannot be pre-approved.');
assert(contract.approvals?.animation_semantics_approved === false, 'Animation semantics cannot be pre-approved.');
assert(Array.isArray(contract.required_artifacts) && contract.required_artifacts.length >= 8, 'Required artifact list is incomplete.');

let outputSummary = null;
if (mirrorDir) {
  const readJson = async (name) => JSON.parse(await readFile(path.join(mirrorDir, name), 'utf8'));
  const [manifest, qa, sceneGraph, meshes, accessors, sourceAssets, animations, semanticCandidates, payload] = await Promise.all([
    readJson('manifest.json'),
    readJson('qa.json'),
    readJson('scene-graph.json'),
    readJson('meshes.json'),
    readJson('accessors.json'),
    readJson('source-assets.json'),
    readJson('animations.json'),
    readJson('semantic-candidates.json'),
    readFile(path.join(mirrorDir, 'reference-accessor-payload.bin'))
  ]);

  assert(manifest.schema === 'haihao.aircraft/reference-full-mirror@1.0.0', 'Mirror manifest schema mismatch.');
  assert(manifest.source?.bytes === SOURCE_LOCK.bytes, 'Mirror source byte lock mismatch.');
  assert(manifest.source?.sha256 === SOURCE_LOCK.sha256, 'Mirror source hash lock mismatch.');
  for (const [key, expected] of Object.entries(SOURCE_LOCK)) {
    if (key === 'bytes' || key === 'sha256') continue;
    assert(manifest.inventory?.[key] === expected, `Mirror inventory mismatch for ${key}.`);
  }
  assert(qa.result === 'structural-mirror-extraction-pass', 'Structural mirror extraction did not pass.');
  assert(qa.semantic_auto_approval_count === 0, 'Semantic candidates were automatically approved.');
  assert(sceneGraph.nodes?.length === SOURCE_LOCK.nodes, 'Scene graph node coverage mismatch.');
  assert(meshes.meshes?.length === SOURCE_LOCK.meshes, 'Mesh contract coverage mismatch.');
  assert(accessors.accessors?.length === SOURCE_LOCK.accessors, 'Accessor coverage mismatch.');
  assert(sourceAssets.images?.length === SOURCE_LOCK.images, 'Embedded image coverage mismatch.');
  assert(animations.animations?.length === SOURCE_LOCK.animations, 'Animation count mismatch.');
  const channelCount = animations.animations.reduce((sum, animation) => sum + animation.channels.length, 0);
  const samplerCount = animations.animations.reduce((sum, animation) => sum + animation.samplers.length, 0);
  assert(channelCount === SOURCE_LOCK.animationChannels, 'Animation channel coverage mismatch.');
  assert(samplerCount === SOURCE_LOCK.animationSamplers, 'Animation sampler coverage mismatch.');
  assert(sha256(payload) === manifest.mirror_payload?.sha256, 'Mirror payload SHA-256 mismatch.');
  assert(payload.length === manifest.mirror_payload?.bytes, 'Mirror payload byte length mismatch.');

  const blocks = new Map((accessors.blocks || []).map((block) => [block.block_id, block]));
  assert(blocks.size === manifest.mirror_payload?.unique_packed_block_count, 'Unique packed block count mismatch.');
  for (const block of blocks.values()) {
    const start = block.byte_offset;
    const end = start + block.byte_length;
    assert(start >= 0 && end <= payload.length, `Block ${block.block_id} exceeds payload bounds.`);
    if (start >= 0 && end <= payload.length) {
      assert(sha256(payload.subarray(start, end)) === block.sha256, `Block ${block.block_id} hash mismatch.`);
    }
  }
  for (const accessor of accessors.accessors || []) {
    const block = blocks.get(accessor.packed_block_id);
    assert(Boolean(block), `Accessor ${accessor.accessor_index} references missing block ${accessor.packed_block_id}.`);
    if (block) {
      assert(accessor.packed_byte_offset === block.byte_offset, `Accessor ${accessor.accessor_index} block offset mismatch.`);
      assert(accessor.packed_byte_length === block.byte_length, `Accessor ${accessor.accessor_index} block length mismatch.`);
      assert(accessor.packed_sha256 === block.sha256, `Accessor ${accessor.accessor_index} block hash mismatch.`);
    }
  }
  for (const group of semanticCandidates.groups || []) {
    assert(group.status === 'candidate-only-upstream-review-required', `Semantic group ${group.group_id} has an invalid status.`);
    assert(group.automatic_approval === false, `Semantic group ${group.group_id} was automatically approved.`);
  }
  const requiredUnresolved = new Set(['armament.turret', 'armament.gun', 'crew.entity']);
  const unresolved = new Set(manifest.semantic_policy?.unresolved_groups || []);
  for (const groupId of requiredUnresolved) assert(unresolved.has(groupId), `Expected unresolved group ${groupId} was not retained.`);

  outputSummary = {
    mirror_payload_bytes: payload.length,
    mirror_payload_sha256: sha256(payload),
    accessor_count: accessors.accessors.length,
    unique_block_count: blocks.size,
    node_count: sceneGraph.nodes.length,
    mesh_count: meshes.meshes.length,
    image_count: sourceAssets.images.length,
    animation_channel_count: channelCount,
    animation_sampler_count: samplerCount,
    semantic_auto_approval_count: qa.semantic_auto_approval_count
  };
}

if (errors.length) {
  console.error(JSON.stringify({ result: 'fail', errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  result: 'pass',
  contract: contractPath,
  mirror_dir: mirrorDir,
  output: outputSummary,
  approvals: contract.approvals
}, null, 2));
