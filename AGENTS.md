# Repository rules

1. Treat every model lock and runtime lock as immutable.
2. Never substitute an aircraft model after a lock is approved.
3. Keep model geometry, flight runtime, livery production, and final integration in separate directories and commits.
4. One livery package belongs to one aircraft identity and one model lock.
5. Never mirror historical markings unless the evidence explicitly proves symmetry.
6. Never modify an approved flight runtime while producing a livery.
7. Every derived GLB requires its own lock, source-model reference, transformation record, and regression result.
8. Do not add task transcripts, handoff dumps, temporary reports, failed previews, or duplicate binaries to the repository.
9. Run `npm test` and `npm run build` before opening or updating a pull request.
10. Keep pull requests draft until their own production gate is complete.
