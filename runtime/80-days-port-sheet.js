export const PORT_SOURCE={width:1448,height:1086};
export const E04={width:2000,height:1243,sha256:'07439c42eac526d5a209a6bf767853302089099eda4df11128a0e8b56a6a81fa'};

export const COMPONENTS={
  robby:{rect:[145,235,165,115],status:'measured',placement:{mode:'crop-local',scale:.99,rotationDeg:-1.25,targetTopLeft:[512,264]}},
  title:{rect:[520,215,905,275],status:'measured',placement:{mode:'source-global-similarity',scale:1.20386678,rotationDeg:1.73451,translation:[256.87944,-41.42754],fitRmsePx:4.06}},
  dice1:{rect:[825,480,230,235],status:'measured',placement:{mode:'source-global-similarity',scale:1.20689748,rotationDeg:2.26564,translation:[201.69201,-81.28390]}},
  dice2:{rect:[1050,480,230,240],status:'measured',placement:{mode:'source-global-similarity',scale:1.20689748,rotationDeg:2.26564,translation:[201.69201,-81.28390]}},
  mouth:{status:'pending-surface-wrap',reason:'one planar similarity would bake photo perspective into the source; anchor on the fuselage skin instead'},
  mission:{status:'deferred-evidence-conflict',reason:'historical count/state remains disputed'},
  window:{status:'reference-only',reason:'structure reference, not paint'}
};

function drawGlobalSimilarity(ctx,image,rect,p){
  const [x,y,w,h]=rect;
  const a=p.rotationDeg*Math.PI/180;
  ctx.save();
  ctx.translate(p.translation[0],p.translation[1]);
  ctx.rotate(a);
  ctx.scale(p.scale,p.scale);
  ctx.drawImage(image,x,y,w,h,x,y,w,h);
  ctx.restore();
}

function drawCropLocal(ctx,image,rect,p){
  const [sx,sy,sw,sh]=rect;
  const dw=sw*p.scale,dh=sh*p.scale;
  const cx=p.targetTopLeft[0]+dw/2,cy=p.targetTopLeft[1]+dh/2;
  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(p.rotationDeg*Math.PI/180);
  ctx.drawImage(image,sx,sy,sw,sh,-dw/2,-dh/2,dw,dh);
  ctx.restore();
}

export function buildMeasuredPortPhotoSheet(sourceImage){
  const canvas=document.createElement('canvas');
  canvas.width=E04.width; canvas.height=E04.height;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawCropLocal(ctx,sourceImage,COMPONENTS.robby.rect,COMPONENTS.robby.placement);
  drawGlobalSimilarity(ctx,sourceImage,COMPONENTS.title.rect,COMPONENTS.title.placement);
  drawGlobalSimilarity(ctx,sourceImage,COMPONENTS.dice1.rect,COMPONENTS.dice1.placement);
  drawGlobalSimilarity(ctx,sourceImage,COMPONENTS.dice2.rect,COMPONENTS.dice2.placement);
  return canvas;
}

export function sourceSheetState(){
  return {
    schema:'haihao.aircraft/80-days-port-photo-sheet@1',
    exactSourcePixels:true,
    redrawnArtwork:false,
    motherGeometryModified:false,
    components:COMPONENTS,
    visualAcceptance:false,
    productionReady:false
  };
}
