export const intro = {
  eyebrow: 'BUREAU OBSCURA / FIELD RECOVERY',
  title: 'The Ninth Pane',
  coordinate: 'Glasshouse / 04 November 1931 / 03:17',
  deck: [
    'Bureau Obscura recovers places, events, and memories through scent. Its field assignments can take an agent to any point in time. The evidence returns to the Bureau, where it becomes the basis of a fragrance.',
    'You are a Bureau field agent. Your brief takes you to a glasshouse in 1931. It has eight roof sections outside. From inside, you count nine. Find out what holds the extra room open, recover a sample, and bring your findings back.'
  ],
  brief: [
    'ASSIGNED COORDINATE: Glasshouse. 04 November 1931. 03:17.',
    'An additional room has formed around an orange tree. It extends beyond the building’s outside wall. The air inside is warm and carries a strong scent of blossom, crushed leaves, and wet soil.',
    'Your task is to examine the room, establish how it behaves, and recover sensory evidence. Keep the anomaly contained if you can. Return to the Bureau with your samples and field record.',
    'Begin in the main hall. Take a baseline scent sample before changing anything. Your kit contains sampling tubes, blotters, a camera, and survey tools. Record clues as you explore, then compare them in Field notes.'
  ]
};

export const scenes = {
  gate: {
    title: 'The service gate', subtitle: 'Assigned coordinate / 04 November 1931', image: 'exterior', weather:'Rain on the glass roof',
    description: [
      'Rain runs off the glass roof onto the gravel. Through the entrance, a line of empty planting benches leads to a lit room at the far end. An orange tree stands inside it.',
      'You check the building against your brief. The brick end wall is only a few paces beyond the last roof section. The room around the tree appears to continue much farther.',
      'You lift the gate latch and set your case beneath the porch. Warm air escapes from a roof vent, carrying orange blossom into the rain. Start your survey in the main hall.'
    ],
    sensory:{air:'Orange blossom from the roof vent.',contact:'Cold rainwater on the iron latch.',residue:'Potting soil washed onto the entrance step.'},
    hotspots:[{id:'exterior',x:64,y:28,label:'Measure the outside wall'},{id:'closure',x:24,y:69,label:'Check your assigned coordinate'}],
    adjacent:['nave','office']
  },
  nave: {
    title:'Main hall',subtitle:'The extra room beyond the glass door',image:'nave',weather:'26°C beyond the pane',
    description:[
      'Eight empty bays lead to a glass door. Beyond it, an orange tree grows from a bed of dark soil. Its branches carry flowers and green fruit at the same time.',
      'The bed of soil ends exactly at the iron frame around the room. A root runs along the glass, turning at each corner. The glasshouse floor beyond it is bare.',
      'You stay in the main hall. A small service hatch opens beside a low branch. The flowers and the soil beneath the trunk are farther in. Take a scent sample and record the room before testing its boundaries.'
    ],
    sensory:{air:'Orange blossom over warm, wet soil.',contact:'Condensation on the glass door.',residue:'A root follows the inside edge of the iron frame.'},
    hotspots:[{id:'footprints',x:54,y:78,label:'Test the doorway with a leaf'},{id:'thermal',x:31,y:41,label:'Measure the room as it cools'}],
    adjacent:['gate','potting','boiler','passage','office']
  },
  potting: {
    title:'The potting room',subtitle:'Preparing a specimen',image:'potting',weather:'Dry bench / cold air',
    description:[
      'A nursery jar sits on the bench beside a wooden plant press. You lay out damp cloth, long shears, and the specimen guide from your field case.',
      'The service hatch opens beside the orange tree. One pale shoot is within reach of the shears. The older branches are too thick to cut with them.',
      'You can keep that shoot alive in the jar or dry it in the press. Check the guide and equipment before choosing. The living shoot will stay on the warm inner ledge until you are ready to move it.'
    ],
    sensory:{air:'Dry compost and the green smell of cut stems.',contact:'Rough cloth beside a smooth glass jar.',residue:'Old soil caught between the bench boards.'},
    hotspots:[{id:'graft',x:28,y:60,label:'Read your specimen guide'},{id:'carrier',x:69,y:56,label:'Examine the jar and plant press'}],
    adjacent:['nave','passage']
  },
  boiler: {
    title:'The boiler room',subtitle:'Tracing the heat beneath the tree',image:'boiler',weather:'Hot water circulating',
    description:[
      'The burner catches with a low thump. A single pipe carries hot water beneath the orange tree. The other branches are cold.',
      'A pressure gauge trembles above the controls. When the burner pauses, the pipe ticks and the distant glass door shifts across the floor.',
      'A metal instruction plate gives the shutdown order. You can mark a plan without touching the controls. First, establish what happens to the extra room when its heat is removed.'
    ],
    sensory:{air:'Fuel oil and hot iron.',contact:'A steady vibration through the floor.',residue:'Rust beneath a slow pipe leak.'},
    hotspots:[{id:'fuel',x:69,y:68,label:'Watch a full burner cycle'},{id:'pipe',x:25,y:40,label:'Trace the pipe and read the controls'}],
    adjacent:['nave','passage']
  },
  passage: {
    title:'Side passage',subtitle:'Access to the planting bed',image:'nave',weather:'Warm air at the hatch',
    description:[
      'The passage runs behind the planting benches. A narrow service hatch opens beside the tree, below its lowest branch.',
      'A green leaf rests on the soil just inside the opening. Beside it lies a dry brown leaf. Both are within reach of your survey tongs.',
      'You have a clear view of the glass door from here. A chalk mark beside its frame will show whether it moves during your tests.'
    ],
    sensory:{air:'Sharp orange oil from the bruised leaf.',contact:'Warm droplets on the hatch handle.',residue:'White chalk on a wet floor tile.'},
    hotspots:[{id:'cutting',x:63,y:55,label:'Compare a fresh leaf with a dry one'}],
    adjacent:['nave','potting','boiler']
  },
  office: {
    title:'Office',subtitle:'Checking the field record',image:'office',weather:'Dry room / rain outside',
    description:[
      'You clear a space on the desk for your case and notebook. Rain taps against the window. The floor and papers are dry.',
      'From the chair, you can see the glasshouse’s brick end wall and its eight roof sections. Your outside measurements and inside sketch overlap on the desk. The extra room occupies space beyond that wall.',
      'This is a place to check what you have actually observed before choosing a recovery method. Lay out the record, label your evidence, and mark anything still unknown.'
    ],
    sensory:{air:'Paper, dry wood, and soil from your boots.',contact:'A dry desk beneath your notebook.',residue:'Water from your case leaves a ring on the blotter.'},
    hotspots:[{id:'letter',x:45,y:65,label:'Lay out your measurements'}],
    adjacent:['gate','nave']
  }
};

export const evidence = {
  exterior:{
    title:'Eight bays outside, nine inside',kind:'Building survey',location:'gate',detail:'plan',
    body:[
      'You count eight roof sections along the outside wall. Each covers one planting bay. Beyond the eighth section, the glasshouse ends at a solid brick wall.',
      'From the entrance, you count nine bays. The last contains the orange tree. Your tape places its far side four metres beyond the outside wall.',
      'You photograph the wall, mark your measuring points, and sketch the extra space. There is no extension behind the building.'
    ],excerpt:'The ninth bay adds four metres inside a building whose outside wall has not moved.'
  },
  closure:{
    title:'The assigned coordinate',kind:'Bureau brief',location:'gate',detail:'letter',
    body:[
      'Your brief identifies this glasshouse at 03:17 on 04 November 1931. The gate, roof plan, and position of the boiler chimney match its reference drawing.',
      'The assigned recovery is the atmosphere around the orange tree: blossom, bitter leaf oil, and warm soil. Record the conditions that produce it and bring back material the Bureau can examine.',
      'You note your arrival and the rain. The watch in your kit advances normally.'
    ],excerpt:'Recover the scent of the extra room and the evidence needed to explain its behaviour.'
  },
  footprints:{
    title:'The door moves with a fresh leaf',kind:'Doorway test',location:'nave',detail:'survey',
    body:[
      'You slide a survey weight through the open door. It lands beneath the tree. Pulling it back across the sill returns it to that spot, leaving the cord in your hand. You mark the sill and leave the weight inside.',
      'Using tongs through the service hatch, you lift a fresh leaf from the warm soil. As you bring it outward, the entire glass door moves toward you by one floor tile.',
      'The leaf cools in the main hall. Its edges begin to curl, and the door slides back. An old brown leaf produces no movement. Throughout both tests, the roots stop at the iron frame. You photograph a root pressed against a hairline crack in the fixed pane.'
    ],excerpt:'Fresh growth moves the doorway. A dry leaf does nothing.'
  },
  thermal:{
    title:'Cooling makes the room smaller',kind:'Temperature test',location:'nave',detail:'thermal',
    body:[
      'Your thermometer reads twenty-six degrees beyond the door and eleven in the main hall. You pull the upper vent open with the hook from your kit.',
      'Warm air escapes. As the temperature falls, the far wall moves toward the tree. The soil bed shortens by one tile. You close the vent before the wall reaches the branches.',
      'The pipe beneath the tree warms the room again. The wall returns to its first position. You record the temperatures and the distance moved.'
    ],excerpt:'The room contracts when it cools and expands when the pipe warms it again.'
  },
  graft:{
    title:'Keeping a specimen alive',kind:'Bureau field guide',location:'potting',detail:'notebook',
    body:[
      'The guide describes two ways to preserve a plant cutting. For living material, wrap the cut end in damp cloth and keep it warm in a covered carrier.',
      'For a dry specimen, flatten the shoot between absorbent sheets. Change the sheets until the stem and leaves are dry. The shape survives; the plant cannot grow again.',
      'A loose leaf loses warmth and moisture quickly. A wrapped shoot can remain alive during the journey back to the Bureau.'
    ],excerpt:'A damp wrap and a covered carrier keep a shoot warm and alive.'
  },
  carrier:{
    title:'The jar and the press',kind:'Recovery equipment',location:'potting',detail:'cutting',
    body:[
      'The nursery jar fits in your insulated field case. Its lid has an intact rubber seal. You can lower the cut shoot into it without touching the leaves.',
      'The press holds dry blotting sheets. Its screws can flatten a small shoot while you continue the survey. Once dried, the specimen can be withdrawn through the hatch without shifting the door.',
      'Only one shoot is within reach of the shears. Preparing it alive leaves a transfer possible. Drying it gives you an inactive specimen instead.'
    ],excerpt:'One shoot can become a living recovery or a dry specimen.'
  },
  fuel:{
    title:'The room follows the burner cycle',kind:'Repeated observation',location:'boiler',detail:'thermal',
    body:[
      'You watch through the pipe opening as the burner cycles. When it stops, the pipe cools and the far wall of the extra room moves inward.',
      'The burner starts again. Hot water reaches the orange bed, and the wall moves back. You observe the same sequence three times.',
      'The changes follow the heat reaching the tree. The rest of the glasshouse stays cold and keeps its shape.'
    ],excerpt:'Each loss of heat contracts the ninth bay. Reheating restores it.'
  },
  pipe:{
    title:'The live pipe and the controls',kind:'Heating survey',location:'boiler',detail:'plan',
    body:[
      'You trace the only hot pipe from the boiler to the bed beneath the orange tree. The valve beside the burner closes its supply.',
      'A metal plate lists the shutdown order: open the upper vent, close the heat supply, then open the inner glass door after the room has cooled.',
      'The vent lets hot air escape before cold air enters through the door. You copy the sequence and mark a place beneath the vent for a sampling tube. The controls remain untouched.'
    ],excerpt:'Vent first. Close the heat supply. Wait for cooling before opening the door.'
  },
  cutting:{
    title:'Fresh and dry leaves behave differently',kind:'Specimen test',location:'passage',detail:'cutting',
    body:[
      'You draw a warm green leaf toward the hatch with your tongs. The door moves one tile toward you. You return the leaf to the soil; the door moves back.',
      'You repeat the test with a dry leaf from the same bed. The door stays still. The green leaf also stops moving the door after it cools and curls on the cold ledge.',
      'The movement depends on keeping the plant material fresh. A cutting protected from cold and drying could carry the doorway farther than a loose leaf.'
    ],excerpt:'The doorway follows fresh plant material while it stays warm and moist.'
  },
  letter:{
    title:'The wall and the room share a position',kind:'Field record',location:'office',detail:'plan',
    body:[
      'You align your inside sketch with the outside measurements. The tree’s bed lies beyond the brick end wall. From this office window, that same patch of ground is bare gravel.',
      'You photograph the gravel through the window, then the tree through the glasshouse door. Both pictures include the same corner post as a reference.',
      'Your record now shows where the extra space begins. The pictures do not explain its cause. Heat and plant tests will have to establish what can move it.'
    ],excerpt:'The same measured position holds bare gravel outside and an orange tree inside.'
  }
};

export const deductions = {
  heat:{
    title:'What holds the room open',
    question:'Which two clues connect the extra room to the heating system?',
    pairs:[['fuel','pipe'],['pipe','thermal'],['fuel','thermal']],
    success:'Hot water beneath the tree holds the extra room open. Removing that heat makes it contract. A full shutdown should close it, so collect its scent before the room is gone.',
    hint:[
      'Compare a change in the room with a change in its heat.',
      'Check the vent test in the main hall and the hot pipe in the boiler room.',
      'Connect the temperature test with the heating survey. Cooling shrinks the room; the live pipe restores it.'
    ]
  },
  boundary:{
    title:'What moves the doorway',
    question:'Which two clues show how to keep the doorway moving with a cutting?',
    pairs:[['graft','footprints'],['graft','cutting'],['carrier','cutting']],
    success:'The doorway follows plant material while it stays warm and moist. The wrapped shoot could draw it into a carrier. Keep the shoot inside until you are ready: transferring it may move the whole room.',
    hint:[
      'Find what moves the door, then what keeps that material fresh.',
      'Compare a leaf test with the specimen guide in the potting room.',
      'Connect the fresh-leaf test with the guide. A damp wrap and covered carrier preserve the conditions that moved the door.'
    ]
  }
};

export const survey = [
  'You photograph the room from the main hall and measure its doorway. The thermometer reads twenty-six degrees inside, eleven outside.',
  'You hold a clean blotter at the service hatch. Orange blossom settles first, followed by bitter leaf oil and the earthy smell of warm soil. You seal it in a sampling sleeve and label it with the coordinate.',
  'You have a record of the room before any intervention. Now test the heat and the doorway. Your field notes will help you choose what to recover and what to leave in place.'
];

export const endings = {
  cool:{
    number:'01',title:'The last warm air',subtitle:'A stable scent sample. The extra room closes.',
    body:[
      'You place a chilled sampling tube beneath the upper vent and pull it open. Warm air clouds the tube. Clear droplets collect along its glass.',
      'You close the heat supply. The far wall moves toward the tree as the temperature falls. When both thermometers read eleven degrees, you open the inner door.',
      'The last leaves fold against the brickwork. The tree and soil bed disappear. Beyond the door is the end wall you measured outside. You walk the building again and count eight bays.',
      'Back at the Bureau, you open the tube over a fresh blotter. Blossom rises from it, followed by bitter orange oil and damp soil. You file the sample with your measurements and photographs. The ninth bay survives in that record.'
    ],
    recovered:'Vent condensate',site:'Closed',
    sensory:{air:'Orange blossom from the opened sample tube.',contact:'Cool glass in the specimen rack.',residue:'Clear condensate and the baseline scent blotter.'},
    hint:'Solve both questions and plan the shutdown. Collect the escaping scent before cooling closes the room.'
  },
  carry:{
    number:'02',title:'The room in the jar',subtitle:'The anomaly returns to the Bureau alive.',
    body:[
      'You set the open jar against the hatch and lift the wrapped shoot from the inner ledge. The glass doorway follows it across the floor. You keep pulling until the cut stem rests inside the jar.',
      'The far wall folds inward. For a moment the whole room fits between the jar’s neck and its base. You lower the lid and fasten it. The glasshouse ends at its original brick wall.',
      'Through the jar you can see the full orange tree and its soil bed. They remain at their original size when you look through the glass. The case is still light enough to carry.',
      'At the Bureau, you place the sealed jar in an empty observation cabinet with your field record. Condensation forms beneath its lid. The tree continues to flower. You have recovered the source of the scent, along with the room that holds it.'
    ],
    recovered:'Living enclosed anomaly',site:'Removed',
    sensory:{air:'Orange oil left on the damp wrapping cloth.',contact:'The sealed jar remains warm.',residue:'A complete room visible inside the carrier.'},
    hint:'Solve both questions and keep the shoot alive. Moving it into the carrier may bring the room with it.'
  },
  stay:{
    number:'03',title:'A sealed coordinate',subtitle:'The room stays intact. Its scent and survey return with you.',
    body:[
      'You leave the heat supply as you found it. The orange tree remains beyond the glass door. You close the service hatch and fasten Bureau seals across the access points.',
      'You take a final photograph from the main hall and mark the room’s limits on your site plan. The sealed baseline blotter carries the scent you collected before the tests.',
      'At the gate, you check that no plant material has reached the outer side of the building. You lock the entrance and record the boiler’s setting for the next Bureau survey.',
      'You return to the Bureau with the blotter, photographs, and measurements. The sample can be studied without moving the active room. Your report leaves the coordinate under observation and identifies the ninth bay as still present.'
    ],
    recovered:'Scent blotter and survey',site:'Sealed for observation',
    sensory:{air:'Blossom and soil held in a sampling sleeve.',contact:'The field case rests cold on the archive desk.',residue:'Photographs, measurements, and a sealed coordinate.'},
    hint:'Complete the baseline survey. Recover its record and scent while preserving the active site.'
  },
  break:{
    number:'04',title:'Beyond the frame',subtitle:'You recover material, but lose containment of the room.',
    body:[
      'The flowers and soil beneath the trunk are beyond reach from the hatch. You strike the fixed pane with your hammer, widening the crack beside the root. Glass falls inward. You now have a direct opening beside the tree.',
      'You draw wet soil and a flower into a sample tin with the long scoop. As you seal it, the root pushes through the broken pane and over the iron sill. The next planting bay fogs with condensation. New leaves push through its bench.',
      'You retreat through the main hall. Behind you, each set of panes fills with condensation. At the gate, you photograph a ninth roof section rising beyond the old end wall. The growth has crossed the building’s outside boundary.',
      'You return to the Bureau with the soil, flower, and a piece of the broken pane. The samples retain their scent. Your report records a failed containment and the expanded site’s last measured limits.'
    ],
    recovered:'Soil, flower, and glass',site:'Containment failed',
    sensory:{air:'Strong blossom when the sample tin is opened.',contact:'A warm shard secured in its padded sleeve.',residue:'Wet soil and a flower from the expanding room.'},
    hint:'Test the doorway and temperature first. Breaking the fixed pane gives direct access, with a risk of spreading the anomaly.'
  }
};
