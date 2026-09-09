// Persistent instance differences only. Surface/display buffers are built at runtime.
export const INSTANCE={
 id:'b24-42-73257-80-days-placement-r1',name:'80 DAYS',version:'placement-r1',
 parent:{id:'b24-generic-mother-01',commit:'47ba8a21676b49e6a1d4d6d4285c28ba1f2f538a',payloadSHA256:'f5ff859a7ff0e38112fa099d8c7d3a4cd8e859434701fb4dd9d81629374c5e3e'},
 frame:{id:'mother01:aircraft',axes:{x:'port',y:'up',z:'nose'},unit:'parent-working-metre',engineeringCalibrated:false},
 identity:{serial:'42-73257',tacticalCode:'487',paintedSerialCandidate:'273257',unit:'308BG/374BS',photoDate:null},
 colors:{ivory:'#eee9cd',mouth:'#171c19',tongue:'#662e26',bomb:'#d6ad38',flag:'#c7bd97',sun:'#94352c'},
 colorEvidence:{ivory:'display choice; light tone observed in monochrome photographs',mouth:'display choice; dark tone observed',tongue:'candidate only',bomb:'user-specified B17 reference, not historical color verification',flag:'display approximation',sun:'flag interpretation, not measured pigment'},
 patches:{
  port:{source:'E04',sourceSize:[2000,1243],candidateSide:true,targets:[1714,1747,1678,1760],projection:{z:[7.70,-.00215,0],y:[-.20,0,-.00160]},pixelBoundaryEstimate:8,placementEnvelopeWorkingM:.18},
  starboard:{source:'E07',sourceSize:[2000,933],candidateSide:false,targets:[1714,1747,1678,1760],projection:{z:[-11.63,.0102,0],y:[3.49,0,-.0085]},pixelBoundaryEstimate:5,placementEnvelopeWorkingM:.22},
  tail:{source:'E07',sourceSize:[2000,933],targets:[1717,719,744],projection:{z:[-12.2872,.0116,0],y:[5.32,0,-.0104]},pixelBoundaryEstimate:6,placementEnvelopeWorkingM:.14}
 },
 status:'visual-placement-trial; not historical-complete or engineering-calibrated',
 sources:[{id:'E04',sha256:'07439c42eac526d5a209a6bf767853302089099eda4df11128a0e8b56a6a81fa'},{id:'E07',sha256:'2a4d1873055dbfef67f0416f4515b03e8489a566f6c451f4a133a09bf7b1043f'},{id:'tail-metadata',url:'https://www.rshonor.net/node/17865',scope:'273257 is a metadata candidate; image not visually verified'}]
};

// Hand-interpreted bounded curves; this first pass is not an exact outline extraction.
export const GLYPHS={
 '8':{outer:'M25 2 C3 2 -4 26 10 44 C-12 63 -3 99 26 99 C57 99 62 64 43 47 C64 25 49 0 25 2 Z',holes:['M25 17 C38 16 40 36 27 37 C13 38 12 18 25 17 Z','M25 59 C42 58 43 82 27 83 C10 84 10 60 25 59 Z']},
 '0':{outer:'M28 1 C-8 2 -5 95 25 100 C62 105 69 3 28 1 Z',holes:['M28 21 C42 19 43 78 28 80 C11 82 12 22 28 21 Z']},
 'D':{outer:'M0 0 L31 0 C75 1 71 88 26 100 L0 97 L6 18 Z',holes:['M22 19 L28 20 C47 23 47 69 24 78 Z']},
 'A':{outer:'M3 100 L20 0 L46 0 L73 99 L49 98 L45 72 L23 74 L23 100 Z',holes:['M28 56 L40 55 L33 28 Z']},
 'Y':{outer:'M0 0 L24 0 L40 37 L54 0 L78 1 L49 63 L43 99 L20 99 L27 61 Z',holes:[]},
 'S':{outer:'M57 8 C15 -18 -17 27 6 49 L32 65 C44 76 20 88 11 67 L-4 80 C14 116 65 96 56 66 C54 54 35 47 23 38 C11 29 27 12 40 31 Z',holes:[]},
 '2':{outer:'M2 18 C3 -3 51 -7 54 19 C57 41 23 57 17 79 L54 79 L54 98 L-1 98 L0 79 C7 47 38 32 36 21 C34 11 21 13 18 26 Z',holes:[]},
 '3':{outer:'M1 11 C30 -12 63 6 49 37 L37 48 C67 58 57 100 26 100 C11 100 3 96 -1 87 L10 73 C24 88 43 80 36 64 C32 59 20 60 16 61 L16 42 C35 44 45 14 23 19 L10 26 Z',holes:[]},
 '4':{outer:'M28 0 L50 0 L50 59 L62 59 L62 76 L50 76 L50 99 L32 99 L32 76 L0 76 L0 60 Z',holes:['M15 59 L32 59 L32 23 Z']},
 '5':{outer:'M3 0 L53 0 L53 18 L20 18 L17 38 C52 26 70 71 48 92 C35 105 7 102 -1 89 L10 75 C31 92 48 64 29 55 L0 60 Z',holes:[]},
 '7':{outer:'M0 0 L59 0 L59 16 L27 99 L7 99 L39 18 L0 18 Z',holes:[]},
 'R':{outer:'M0 0 L28 0 C61 0 65 48 37 56 L59 99 L37 99 L17 59 L17 99 L0 99 Z',holes:['M17 18 L26 18 C41 18 43 41 18 42 Z']},
 'O':{outer:'M28 0 C-10 0 -10 100 28 100 C67 100 67 0 28 0 Z',holes:['M28 20 C44 20 44 80 28 80 C12 80 12 20 28 20 Z']},
 'B':{outer:'M0 0 L26 0 C55 0 64 34 41 48 C68 60 58 100 25 100 L0 100 Z',holes:['M17 17 L25 17 C43 17 42 40 17 40 Z','M17 58 L27 58 C43 58 44 83 17 83 Z']},
 'H':{outer:'M0 0 L18 0 L18 39 L39 39 L39 0 L57 0 L57 99 L39 99 L39 58 L18 58 L18 99 L0 99 Z',holes:[]},
 'U':{outer:'M0 0 L18 0 L18 70 C18 84 37 84 37 69 L37 0 L56 0 L56 74 C56 109 0 108 0 74 Z',holes:[]},
 'F':{outer:'M0 0 L56 0 L56 19 L18 19 L18 40 L48 40 L48 60 L18 60 L18 99 L0 99 Z',holes:[]},
 'T':{outer:'M0 0 L62 0 L62 20 L41 20 L41 99 L21 99 L21 20 L0 20 Z',holes:[]},
 'M':{outer:'M0 100 L0 0 L20 0 L34 40 L48 0 L68 0 L68 100 L49 100 L49 43 L34 72 L19 43 L19 100 Z',holes:[]}
};
export const PORT_ART={
 name:[{c:'8',x:1000,y:342,w:142,h:214,angle:-9},{c:'0',x:1160,y:317,w:132,h:206,angle:-3},{c:'D',x:1320,y:299,w:166,h:216,angle:2},{c:'A',x:1485,y:306,w:180,h:222,angle:4},{c:'Y',x:1645,y:321,w:168,h:224,angle:8},{c:'S',x:1810,y:357,w:173,h:215,angle:13}],
 quotes:[[[936,376],[967,361],[1006,410],[977,431]],[[974,354],[1005,344],[1044,391],[1018,410]],[[1945,415],[1982,381],[2000,403],[1969,440]],[[1976,446],[2000,420],[2015,441],[1994,461]]],
 mouth:'M-90 539 Q403 532 1006 856 Q1360 1048 1680 1109 Q1256 980 540 1070 Q190 1070 -90 777 Z',
 tongue:'M240 1064 Q539 815 1010 1056 Q608 1018 393 1082 Z',
 topTeeth:[[2,563,91,38],[102,562,96,90],[208,570,125,107],[343,593,133,115],[487,625,91,121],[584,649,76,137],[666,679,89,145],[761,712,108,133],[877,755,128,131],[1008,811,85,126],[1099,852,104,122],[1207,904,87,105],[1298,950,64,80],[1367,986,37,54]],
 bottomTeeth:[[534,1007,119,-147],[660,1008,126,-149],[796,1007,66,-96],[866,1005,81,-96],[953,1005,77,-92],[1040,1007,70,-62],[1115,1010,82,-73],[1203,1018,75,-77],[1286,1028,64,-65],[1358,1046,50,-72]],
 dice:[{corners:[[1270,573],[1434,579],[1425,743],[1190,797],[1193,645]],front:[[1270,573],[1434,579],[1425,743],[1266,750]],pips:[[1303,598],[1400,603],[1349,650],[1303,704],[1400,709]],sidePips:[[1229,686]],bottomPips:[[1280,767],[1316,780],[1360,790]]},{corners:[[1558,584],[1703,603],[1698,752],[1450,816],[1464,655]],front:[[1558,584],[1703,603],[1698,752],[1544,746]],pips:[[1573,609],[1618,671],[1675,721]],sidePips:[[1500,701]],bottomPips:[[1555,779],[1597,800]]}],
 robby:{text:'ROBBY',rect:[533,277,170,56]},huff:{text:'HUFF',rect:[1848,113,143,43]},
 flags:{source:'E04',count:6,rect:[1683,226,44,36],gap:9,totalUnknown:true},
 bombs:{source:'E04',visibleFragmentCount:18,centres:[1504,1531,1558,1585,1611,1638,1663,1693,1721,1750,1778,1806,1834,1863,1890,1918,1949,1977],y:158,size:[20,56],totalUnknown:true}
};

export const STARBOARD_ART={name:[{c:'8',x:1451,y:522,w:25,h:40,angle:-10},{c:'0',x:1476,y:510,w:27,h:44,angle:-7},{c:'D',x:1510,y:501,w:31,h:42,angle:-2},{c:'A',x:1542,y:496,w:32,h:44,angle:2},{c:'Y',x:1573,y:496,w:30,h:45,angle:7},{c:'S',x:1601,y:502,w:28,h:42,angle:9}],mouth:'M1535 615 Q1690 552 1890 548 L1880 579 Q1807 604 1765 650 Q1680 625 1535 636 Z',diceX:[1504,1553],huff:[1427,455,38,10]};
export const TAIL_ART={triangle:[[151,399],[124,473],[189,468]],code:{text:'487',rect:[126,366,46,25]},serial:{text:'273257',rect:[99,332,110,25]},portZ:[-8.8948,-.0116,0]};
