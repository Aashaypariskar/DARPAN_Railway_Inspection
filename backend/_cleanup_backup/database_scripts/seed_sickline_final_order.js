const { Question, Reason } = require('./models');

async function seed() {
    try {
        console.log('--- CLEANING SICK LINE QUESTIONS (MANUAL ORDER MODE) ---');
        await Question.destroy({ where: { section_code: 'SS1-C' } });

        const questions = [
            // Annexure 10.3
            { text: 'Check the automatic mechanism of door for smooth functioning.', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 10, display_order: 1 },
            { text: 'Check all the elements of door mechanism for good condition and working like Shaft, pneumatic cylinder, LM bearings, elastic rope toothed belt, mountings and brackets', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 10, display_order: 2 },
            { text: 'Dismantle the mechanism if not working smoothly and replace or repair the defective element.', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 10, display_order: 3 },
            { text: 'Reassemble the mechanism and check for proper working.', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 10, display_order: 4 },
            { text: 'Check the door flaps for bent, broken or externally damage and repair or replace the defective door flap.', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 10, display_order: 5 },
            { text: 'Check the door flap element like inner & outer locking handle, locking pin, glass and glass frame, male & female hand safe gasket, moldings, mountings, rivets etc. for bent, broken or externally damage and repair or replace the defective element of door flap.', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 10, display_order: 6 },
            { text: 'Check the guide rail for bent, corroded & damage. Repair or replace if required.', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 10, display_order: 7 },
            { text: 'Check the Key locking arrangement for good condition and working.', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 10, display_order: 8 },
            { text: 'Provide suitable lubricate on guide shaft for smooth working.', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 10, display_order: 9 },

            { text: 'Check the automatic mechanism of door for smooth functioning.', item_name: 'SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 20, display_order: 1 },
            { text: 'Check all the elements of door mechanism for good condition and working like Shaft, pneumatic cylinder, LM bearings, elastic rope, mountings and brackets', item_name: 'SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 20, display_order: 2 },
            { text: 'Dismantle the mechanism if not working smoothly and replace or repair the defective element.', item_name: 'SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 20, display_order: 3 },
            { text: 'Reassemble the mechanism and check for proper working.', item_name: 'SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 20, display_order: 4 },
            { text: 'Check the door for bent, broken or externally damage and repair or replace the defective door.', item_name: 'SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 20, display_order: 5 },
            { text: 'Check the door element like inner & outer handle, glass and glass rubber profile, hand safe gasket, moldings, mountings ,rivets etc. for bent, broken or externally damage and repair or replace the defective element of door.', item_name: 'SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 20, display_order: 6 },
            { text: 'Check the ventilation grill for intact and good condition.', item_name: 'SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 20, display_order: 7 },
            { text: 'Check the Key locking arrangement and barrel bolt for good condition and working.', item_name: 'SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 20, display_order: 8 },
            { text: 'Provide suitable lubricate on guide shaft for smooth working.', item_name: 'SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 20, display_order: 9 },

            { text: 'Check the door for bent, broken or externally damage and repair or replace the defective door.', item_name: 'TOILET DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 30, display_order: 1 },
            { text: 'Check the door element like inner & outer handle, hand safe gasket, middle hinge gasket, door frame moldings, upper & lower pivot, roller assembly, rivets etc. for bent, broken or externally damage and repair or replace the defective element of door.', item_name: 'TOILET DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 30, display_order: 2 },
            { text: 'Check the roller guide for bent, corroded, damage or loose fitted. Repair or replace if found defective and ensure for correct fitting and secured firmly.', item_name: 'TOILET DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 30, display_order: 3 },
            { text: 'Check carefully the door locking arrangement for smooth working and ensure upper connecting rod is working properly. If found defective disassemble the door , take out the lock assembly and repair or replace the defective element/ lock assembly.', item_name: 'TOILET DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 30, display_order: 4 },
            { text: 'Check the housing (FRP panel) of upper pivot for damage, broken or loose fitted. If found repair with good ideas and tighten the screws of upper pivot plate.', item_name: 'TOILET DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 30, display_order: 5 },
            { text: 'Check the all other fittings like Inside extra handle, coat hook and barrel bolt are in good condition and secured properly.', item_name: 'TOILET DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 30, display_order: 6 },
            { text: 'If the doors are provided with slide lock and turn over latch , check the condition of sliding rod for bent or damage and turn over latch for bent, broken or damage and replace the defective parts.', item_name: 'TOILET DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 30, display_order: 7 },
            { text: 'Provide suitable lubricate on roller guide for smooth working.', item_name: 'TOILET DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 30, display_order: 8 },

            { text: 'Check the door for bent, broken, shifting of outer sheet or externally damage. If found repair or replace the defective door.', item_name: 'ENTRANCE DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 40, display_order: 1 },
            { text: 'Check the door element like locking handles, glass and glass frame, male & female hand safe gasket, moldings, mountings, rivets etc. for bent, broken or externally damage and repair or replace the defective element of door.', item_name: 'ENTRANCE DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 40, display_order: 2 },
            { text: 'Check the door locking arrangement (Inside & outside both) for smooth working and repair or replace the defective element of door.', item_name: 'ENTRANCE DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 40, display_order: 3 },
            { text: 'Check the condition of hinges for bent or damage and repair or replace the hinges if damage and renew the missing hardware.', item_name: 'ENTRANCE DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 40, display_order: 4 },
            { text: 'Check the door elements like rubber profile etc. for intact and good condition and repair or replace if found damage.', item_name: 'ENTRANCE DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 40, display_order: 5 },
            { text: 'Check the door for smooth working and repair or replace the defective element of door.', item_name: 'ENTRANCE DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 40, display_order: 6 },
            { text: 'Provide suitable lubricate on hinges for smooth working.', item_name: 'ENTRANCE DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 40, display_order: 7 },

            { text: 'Check the door for smooth working of door and hinges.', item_name: 'ELECTRICAL PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 50, display_order: 1 },
            { text: 'Check the door for bent, broken or damage and repair or replace the defective door.', item_name: 'ELECTRICAL PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 50, display_order: 2 },
            { text: 'Check the door locking arrangement for smooth working and repair or replace the defective element of door.', item_name: 'ELECTRICAL PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 50, display_order: 3 },
            { text: 'Check the all other fittings like lower lock mounting, upper lock stopper, Nylon door stopper and barrel bolt are in good condition and secured properly.', item_name: 'ELECTRICAL PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 50, display_order: 4 },
            { text: 'Provide suitable lubricate on hinges for smooth working.', item_name: 'ELECTRICAL PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 50, display_order: 5 },
            // Extra from Set 2 (10.3)
            { text: 'Check the door for bent, broken, shifting or damage. If found repair or replace the defective door.', item_name: 'ELECTRICAL PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 50, display_order: 6 },
            { text: 'Check the door element like glass, glass gasket, door frame moldings, side & middle hinge, Key locking arrangement etc. for broken or damage. If found repair or replace the defective element of door.', item_name: 'ELECTRICAL PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 50, display_order: 7 },

            { text: 'Check the door for smooth working of door and hinges.', item_name: 'CDTS PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 60, display_order: 1 },
            { text: 'Check the door for bent, broken or damage and repair or replace the defective door.', item_name: 'CDTS PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 60, display_order: 2 },
            { text: 'Check the door locking arrangement for smooth working and repair or replace the defective element of door.', item_name: 'CDTS PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 60, display_order: 3 },
            { text: 'Check the all other fittings like lower lock mounting, upper lock stopper, Nylon door stopper and barrel bolt are in good condition and secured properly.', item_name: 'CDTS PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 60, display_order: 4 },
            { text: 'Provide suitable lubricate on hinges for smooth working.', item_name: 'CDTS PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 60, display_order: 5 },
            // Extra from Set 2 (10.3)
            { text: 'Check the door for broken, shifting or damage. If found repair or replace the defective door.', item_name: 'CDTS PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 60, display_order: 6 },
            { text: 'Check the hinges and Key locking arrangement for corroded & damage and replace the defective one.', item_name: 'CDTS PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 60, display_order: 7 },
            { text: 'Check the lock holder for missing, loose fitted and provide or refitted the lock holder and remove the screws form the doors if provided', item_name: 'CDTS PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 60, display_order: 8 },
            { text: 'Repaint the doors from outside.', item_name: 'CDTS PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 60, display_order: 9 },

            // Annexure 10.4
            { text: 'Window glasses: Cracked, dusty', item_name: '1 EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 70, display_order: 1 },
            { text: 'Window glasses Rubber Profiles: Condition', item_name: '1 EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 70, display_order: 2 },
            { text: 'Entrance doors out side Rubber Gaskets: Condition', item_name: '1 EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 70, display_order: 3 },
            { text: 'Destination Board Cover with locking arrangement: Damaged, Function of Lock, cleaned', item_name: '1 EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 70, display_order: 4 },
            { text: 'Entrance Hand Rails (Body handles): Tightness, Condition of plating, cleanliness', item_name: '1 EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 70, display_order: 5 },
            { text: 'Foot steps: Corrosion, Damage, Fixation, Tightness', item_name: '1 EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 70, display_order: 6 },
            { text: 'Examination of body bolster: Condition', item_name: '1 EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 70, display_order: 7 },
            { text: 'Examination of Coach shell (exterior): Condition', item_name: '1 EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 70, display_order: 8 },
            { text: 'Coach exterior painting condition: Condition', item_name: '1 EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 70, display_order: 9 },

            { text: 'Upholstery: Condition of cushioning, rexine, levelling', item_name: '2 INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', section_order: 80, display_order: 1 },
            { text: 'Curtains (Partition & Window): Torn, stains', item_name: '2 INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', section_order: 80, display_order: 2 },
            { text: 'Upper Berth Fenders: Fixation, Tightness', item_name: '2 INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', section_order: 80, display_order: 3 },
            { text: 'PVC - Aisle area: Worn out, shabby look, torn', item_name: '2 INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', section_order: 80, display_order: 4 },
            { text: 'Snack Table: Cracks, damaged, Shabby look, Cleanliness', item_name: '2 INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', section_order: 80, display_order: 5 },
            { text: 'Compartment mirror: Dusty, cracked, de-silvering', item_name: '2 INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', section_order: 80, display_order: 6 },
            { text: 'Magazine Pocket: Condition', item_name: '2 INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', section_order: 80, display_order: 7 },
            { text: 'Bottle Holder: Condition', item_name: '2 INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', section_order: 80, display_order: 8 },
            { text: 'Coat Hooks: Condition', item_name: '2 INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', section_order: 80, display_order: 9 },

            { text: 'Nylon Wire rope: Damaged, worn out', item_name: '3 SALOON SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 90, display_order: 1 },
            { text: 'S S Wire rope: Damaged, worn out', item_name: '3 SALOON SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 90, display_order: 2 },
            { text: 'Vertical & Horizontal Rollers: Smooth movement', item_name: '3 SALOON SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 90, display_order: 3 },
            { text: 'Locking Arrangement: Working', item_name: '3 SALOON SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 90, display_order: 4 },
            { text: 'Door Glass: Cracked, dusty', item_name: '3 SALOON SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 90, display_order: 5 },

            { text: 'Air brake pipe lines: Corrosion, Damage, clamp tightening', item_name: '4 UNDER FRAME', section_code: 'SS1-C', ss1_flag: 'C', section_order: 100, display_order: 1 },
            { text: 'Water system pipe line: Corrosion, Damage, clamp tightening', item_name: '4 UNDER FRAME', section_code: 'SS1-C', ss1_flag: 'C', section_order: 100, display_order: 2 },
            { text: 'Emergency Battery Box Frame: Corrosion, Fixation Bolt', item_name: '4 UNDER FRAME', section_code: 'SS1-C', ss1_flag: 'C', section_order: 100, display_order: 3 },

            { text: 'Drain Cock Protection Cover: New provided', item_name: '5 WATER TANK', section_code: 'SS1-C', ss1_flag: 'C', section_order: 110, display_order: 1 },

            { text: 'Mirror (Outside): Dusty, Cracked', item_name: '6 DOORWAY AREAS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 120, display_order: 1 },
            { text: 'Wash basin: Stainless Steel or FRP (Painted)', item_name: '6 DOORWAY AREAS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 120, display_order: 2 },
            { text: 'Tap (Gravity or Auto sensor): Working condition, leakage', item_name: '6 DOORWAY AREAS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 120, display_order: 3 },
            { text: 'Dust Bin with Fire extinguisher Stand: Stainless Steel or FRP(Painted)', item_name: '6 DOORWAY AREAS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 120, display_order: 4 },
            { text: 'Floor area(Anti slip PVC or Aluminium chequered plate): Worn out, shabby look, tear off', item_name: '6 DOORWAY AREAS', section_code: 'SS1-C', ss1_flag: 'C', section_order: 120, display_order: 5 },

            { text: 'Entrance Door Glass: Dusty, Cracked', item_name: '7 ENTRANCE DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 130, display_order: 1 },
            { text: 'Locking mechanism: Working condition', item_name: '7 ENTRANCE DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 130, display_order: 2 },
            { text: 'Locking handles: Working condition', item_name: '7 ENTRANCE DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 130, display_order: 3 },
            { text: 'Rubber Profile (End): Well positioned', item_name: '7 ENTRANCE DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 130, display_order: 4 },
            { text: 'Barrel Bolt(Locking arrangement): Well positioned', item_name: '7 ENTRANCE DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 130, display_order: 5 },

            { text: 'Mirror (Inside): Dusty, Cracked,', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 1 },
            { text: 'Wash basin: Stainless steel or FRP Painted, Clean', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 2 },
            { text: 'Tap (Gravity tap / Luxury tap): Working condition, Leakage', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 3 },
            { text: 'Soap Dispenser: Working condition, Leakage', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 4 },
            { text: 'Paper roller: Loose, deficient', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 5 },
            { text: 'Hopper Window Glass: Condition of Rubber, Glass, Operation of Upper Glass, Locking arrangement of Upper Glass', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 6 },
            { text: 'Dust Bin: Stainless Steel or FRP(Painted)', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 7 },
            { text: 'Towel Rail: Condition', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 8 },
            { text: 'Coat Hook: Missing', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 9 },
            { text: 'Health faucet: Missing / Leakage', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 10 },
            { text: 'Dust bin: Condition', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 11 },
            { text: 'Mug with Chain: Missing', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 12 },
            { text: 'Commodes: Broken, Chipped, loose fixation', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 13 },
            { text: 'Commode Lid: Condition / missing', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 14 },
            { text: 'Flush Pipe Connection: Condition / Leakage', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 15 },
            { text: 'Flush valve / Push button: Working condition / Leakage', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 16 },
            { text: 'Odour / Smell: Presence', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 17 },
            { text: 'Lavatory Floor: Worn out, Shabby Look, Stagnation of water', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 18 },
            { text: 'Toilet Ceiling: Condition', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 19 },
            { text: 'Commode chute / chute vent: Cracked, Damaged, Cleanliness', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 20 },
            { text: 'Exhaust Fan (If provided): Working condition', item_name: '8 LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', section_order: 140, display_order: 21 },

            { text: 'Guide Roller Channel: Fixation, tightness', item_name: '9 LAVATORY DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 150, display_order: 1 },
            { text: 'Door Glass: Cracked, dusty', item_name: '9 LAVATORY DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 150, display_order: 2 },
            { text: 'Locking mechanism / Handle: Working condition', item_name: '9 LAVATORY DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 150, display_order: 3 },
            { text: 'Latches (inside): Condition', item_name: '9 LAVATORY DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 150, display_order: 4 },
            { text: 'Hinges: Smooth movement', item_name: '9 LAVATORY DOOR', section_code: 'SS1-C', ss1_flag: 'C', section_order: 150, display_order: 5 },

            { text: 'Internal wire rope: Condition', item_name: '10 VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', section_order: 160, display_order: 1 },
            { text: 'External wire rope: Condition', item_name: '10 VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', section_order: 160, display_order: 2 },
            { text: 'Return Spring: Tension / condition', item_name: '10 VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', section_order: 160, display_order: 3 },
            { text: 'Top roller & Bottom roller: Condition', item_name: '10 VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', section_order: 160, display_order: 4 },
            { text: 'Guide rail & Stopper: Condition', item_name: '10 VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', section_order: 160, display_order: 5 },
            { text: 'Manual Locking arrangement: Condition', item_name: '10 VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', section_order: 160, display_order: 6 },
            { text: 'Gangway Fall Plate (Bridge Plate): Hinge condition', item_name: '10 VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', section_order: 160, display_order: 7 },
            { text: 'Hand rails: Fixation / condition', item_name: '10 VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', section_order: 160, display_order: 8 }
        ];

        console.log(`Seeding ${questions.length} strict ordered questions...`);
        const createdQs = await Question.bulkCreate(questions);

        for (const q of createdQs) {
            const reasons = ['Broken', 'Missing', 'Loose', 'Damaged', 'Not Working', 'Leakage', 'Corroded', 'Worn Out', 'Bent'];
            await Reason.bulkCreate(reasons.map(r => ({ question_id: q.id, text: r })));
        }

        console.log('--- FINAL ORDERED SEEDING COMPLETED ---');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
