const { Question, Reason } = require('./models');

async function seed() {
    try {
        console.log('--- CLEANING SICK LINE QUESTIONS (SS-I FILTER MODE) ---');
        await Question.destroy({ where: { section_code: 'SS1-C' } });

        const questions = [
            // Annexure 10.3 (All Gen C)
            { text: 'Check the automatic mechanism of door for smooth functioning.', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 1 },
            { text: 'Check all the elements of door mechanism for good condition and working like Shaft, pneumatic cylinder, LM bearings, elastic rope toothed belt, mountings and brackets.', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 2 },
            { text: 'Dismantle the mechanism if not working smoothly and replace or repair the defective element.', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 3 },
            { text: 'Reassemble the mechanism and check for proper working.', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 4 },
            { text: 'Check the door flaps for bent, broken or externally damage and repair or replace the defective door flap.', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 5 },
            { text: 'Check for the tightness and availability of safety wire for end stopper of sliding door.', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 6 },
            { text: 'Check the condition of sealing and gap between door flaps, glass and glass window. Ensure it is firmly fixed with clamps etc. If found broken or externally damage and repair or replace the defective door flap.', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 7 },
            { text: 'Check the guide rail for bent, corroded or loose fitted.', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 8 },
            { text: 'Check carefully the door locking arrangement for smooth working and ensure upper connecting rod is working properly. If found defective disassemble the door, take out the lock assembly and repair or replace the defective element/lock assembly.', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 9 },

            { text: 'Check the door for bent, broken or externally damage and repair or replace the defective door.', item_name: 'SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 10 },
            { text: 'Check the door element like inner & outer handle, hand safe gasket, middle hinge gasket, door frame moldings, upper & lower pivot, roller assembly, rivets etc. for bent, broken or externally damage and repair or replace the defective element of door.', item_name: 'SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 11 },
            { text: 'Check the roller guide for bent, corroded, damage or loose fitted. Repair or replace if found defective and ensure for correct fitting and secured firmly.', item_name: 'SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 12 },
            { text: 'Check carefully the door locking arrangement for smooth working and ensure upper connecting rod is working properly. If found defective disassemble the door, take out the lock assembly and repair or replace the defective element/lock assembly.', item_name: 'SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 13 },

            { text: 'Check the door for bent, broken or externally damage and repair or replace the defective door.', item_name: 'TOILET DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 20 },
            { text: 'Check the door element like inner & outer handle, hand safe gasket, middle hinge gasket, door frame moldings, upper & lower pivot, roller assembly, rivets etc. for bent, broken or externally damage and repair or replace the defective element of door.', item_name: 'TOILET DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 21 },
            { text: 'Check the roller guide for bent, corroded, damage or loose fitted. Repair or replace if found defective and ensure for correct fitting and secured firmly.', item_name: 'TOILET DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 22 },
            { text: 'Check carefully the door locking arrangement for smooth working and ensure upper connecting rod is working properly. If found defective disassemble the door, take out the lock assembly and repair or replace the defective element/lock assembly.', item_name: 'TOILET DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 23 },

            { text: 'Check the door for bent, broken, shifting or damage. If found repair or replace the defective door.', item_name: 'ELECTRICAL PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', display_order: 30 },
            { text: 'Check the door element like glass, glass gasket, door frame moldings, side & middle hinge, Key locking arrangement etc. for broken or damage. If found repair or replace the defective element of door.', item_name: 'ELECTRICAL PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', display_order: 31 },

            { text: 'Check the door for broken, shifting or damage. If found repair or replace the defective door.', item_name: 'CDTS PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', display_order: 40 },
            { text: 'Check the hinges and Key locking arrangement for corroded & damage and replace the defective one.', item_name: 'CDTS PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', display_order: 41 },
            { text: 'Check the lock holder for missing, loose fitted and provide or refitted the lock holder and remove the screws form the doors if provided.', item_name: 'CDTS PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', display_order: 42 },
            { text: 'Repaint the doors from outside.', item_name: 'CDTS PANEL DOOR', section_code: 'SS1-C', ss1_flag: 'C', display_order: 43 },

            // Exterior Body (Mixed)
            { text: 'Condition of exterior paint (Peeling off, dullness, scratches)', item_name: 'EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', display_order: 50 },
            { text: 'Exterior Body (Corrosion, Damage)', item_name: 'EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', display_order: 51 },
            { text: 'Window glasses (Cracked, dusty)', item_name: 'EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', display_order: 52 },
            { text: 'Window glasses Rubber Profiles (Condition)', item_name: 'EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', display_order: 53 },
            { text: 'Entrance doors out side Rubber Gaskets (Condition)', item_name: 'EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', display_order: 54 },
            { text: 'Destination Board Cover with locking arrangement (Damaged, Function of Lock, cleaned)', item_name: 'EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', display_order: 55 },
            { text: 'Entrance Hand Rails (Body handles) (Tightness, Condition of plating, cleanliness)', item_name: 'EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', display_order: 56 },
            { text: 'Foot steps (Corrosion, Damage, Fixation, Tightness)', item_name: 'EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', display_order: 57 },
            { text: 'Examination of body bolster (Condition)', item_name: 'EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', display_order: 58 },
            { text: 'Examination of Coach shell (exterior) (Condition)', item_name: 'EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', display_order: 59 },
            { text: 'Coach exterior painting condition. (Condition)', item_name: 'EXTERIOR BODY', section_code: 'SS1-C', ss1_flag: 'C', display_order: 60 },

            // Interior of Coach (Mixed)
            { text: 'FRP Panels (Cracks, damaged, Condition of Paint, Shabby look (clean by soap water))', item_name: 'INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: '-', display_order: 70 },
            { text: 'Interior paint condition (Peeling off, dullness, scratches)', item_name: 'INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', display_order: 71 },
            { text: 'Luggage Rack (Tightness, Damage)', item_name: 'INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', display_order: 72 },
            { text: 'Upholstery (Condition of cushioning, rexine, levelling)', item_name: 'INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', display_order: 73 },
            { text: 'Curtains (Partition & Window) (Torn, stains)', item_name: 'INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', display_order: 74 },
            { text: 'Upper Berth Fenders (Fixation, Tightness)', item_name: 'INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', display_order: 75 },
            { text: 'PVC - Inside the compartment (Worn out, shabby look, torn)', item_name: 'INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: '-', display_order: 76 },
            { text: 'PVC - Aisle area (Worn out, shabby look, torn)', item_name: 'INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', display_order: 77 },
            { text: 'Snack Table (Cracks, damaged, Shabby look, Cleanliness)', item_name: 'INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', display_order: 78 },
            { text: 'Compartment mirror (Dusty, cracked, de-silvering)', item_name: 'INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', display_order: 79 },
            { text: 'Magazine Pocket (Condition)', item_name: 'INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', display_order: 80 },
            { text: 'Bottle Holder (Condition)', item_name: 'INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', display_order: 81 },
            { text: 'Coat Hooks (Condition)', item_name: 'INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', display_order: 82 },
            { text: 'Ladder (Painting)', item_name: 'INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', display_order: 83 },
            { text: 'Carpet (I Class) (Torn, stains, cleaned, dust free (Replace if required))', item_name: 'INTERIOR OF COACH', section_code: 'SS1-C', ss1_flag: 'C', display_order: 84 },

            { text: 'Nylon Wire rope (Damaged, worn out)', item_name: 'SALOON SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 90 },
            { text: 'S S Wire rope (Damaged, worn out)', item_name: 'SALOON SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 91 },
            { text: 'Top Mechanism (Working condition, smooth working)', item_name: 'SALOON SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 92 },
            { text: 'Locking mechanism (Working condition)', item_name: 'SALOON SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 93 },
            { text: 'Glass & Rubber profiles (Cleanliness, dusty, cracked)', item_name: 'SALOON SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 94 },
            { text: 'Grill & Grill rubber profiles (Condition)', item_name: 'SALOON SLIDING DOORS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 95 },

            // Under Frame (Mixed)
            { text: 'Head Stock (Corrosion, Damage)', item_name: 'UNDER FRAME', section_code: 'SS1-C', ss1_flag: '-', display_order: 100 },
            { text: 'Sole Bar (Corrosion, Damage)', item_name: 'UNDER FRAME', section_code: 'SS1-C', ss1_flag: '-', display_order: 101 },
            { text: 'Gusset Plate (Corrosion, Damage)', item_name: 'UNDER FRAME', section_code: 'SS1-C', ss1_flag: '-', display_order: 102 },
            { text: 'Cross Members (Corrosion, Damage)', item_name: 'UNDER FRAME', section_code: 'SS1-C', ss1_flag: '-', display_order: 103 },
            { text: 'Water Tank Frame (Corrosion, Damage, tight nut bolt)', item_name: 'UNDER FRAME', section_code: 'SS1-C', ss1_flag: 'C', display_order: 104 },
            { text: 'Air brake Module frame (Corrosion, Damage, tight nut bolt)', item_name: 'UNDER FRAME', section_code: 'SS1-C', ss1_flag: 'C', display_order: 105 },
            { text: 'Air brake pipe lines (Corrosion, Damage, clamp tightening)', item_name: 'UNDER FRAME', section_code: 'SS1-C', ss1_flag: 'C', display_order: 106 },
            { text: 'Water system pipe line (Corrosion, Damage, clamp tightening)', item_name: 'UNDER FRAME', section_code: 'SS1-C', ss1_flag: 'C', display_order: 107 },
            { text: 'Emergency Battery Box Frame (Corrosion, Fixation Bolt)', item_name: 'UNDER FRAME', section_code: 'SS1-C', ss1_flag: 'C', display_order: 108 },

            // Water Tank (All - for SS1)
            { text: 'Pressure testing (At 4.5 Kg/cm² / (9 POUND))', item_name: 'WATER TANK', section_code: 'SS1-C', ss1_flag: '-', display_order: 110 },
            { text: 'Water tank tighting bolts (Tightness)', item_name: 'WATER TANK', section_code: 'SS1-C', ss1_flag: '-', display_order: 111 },
            { text: 'Water level Indicator (Damage, Leakage)', item_name: 'WATER TANK', section_code: 'SS1-C', ss1_flag: '-', display_order: 112 },
            { text: 'Rubber hose connection (Replace of all Rubber hose connection)', item_name: 'WATER TANK', section_code: 'SS1-C', ss1_flag: '-', display_order: 113 },
            { text: 'Drain Cock (Deficient, repair & refit)', item_name: 'WATER TANK', section_code: 'SS1-C', ss1_flag: 'C', display_order: 114 },
            { text: 'Drain Cock Protection Cover (New provided)', item_name: 'WATER TANK', section_code: 'SS1-C', ss1_flag: 'C', display_order: 115 },
            { text: 'Water inlet Cover (Provided)', item_name: 'WATER TANK', section_code: 'SS1-C', ss1_flag: 'C', display_order: 116 },

            // Doorway Areas (Mixed)
            { text: 'Mirror (Outside) Dusty, Cracked', item_name: 'DOORWAY AREAS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 119 },
            { text: 'Dust Bin with Fire extinguisher Stand (Stainless Steel or FRP (Painted))', item_name: 'DOORWAY AREAS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 120 },
            { text: 'Floor area (Anti slip PVC or Aluminium chequered plate) (Worn out, shabby look, tear off)', item_name: 'DOORWAY AREAS', section_code: 'SS1-C', ss1_flag: 'C', display_order: 121 },
            { text: 'CDTS Control Panel Cover (Repaired old FRP OR New sun mica Type.)', item_name: 'DOORWAY AREAS', section_code: 'SS1-C', ss1_flag: '-', display_order: 122 },
            { text: 'Switch Board Doors (Repaired old FRP OR New sun mica Type.)', item_name: 'DOORWAY AREAS', section_code: 'SS1-C', ss1_flag: '-', display_order: 123 },

            { text: 'Entrance Door Glass (Dusty, Cracked)', item_name: 'ENTRANCE DOOR INSPECTION', section_code: 'SS1-C', ss1_flag: 'C', display_order: 130 },
            { text: 'Locking mechanism (Working condition)', item_name: 'ENTRANCE DOOR INSPECTION', section_code: 'SS1-C', ss1_flag: 'C', display_order: 131 },
            { text: 'Locking handles (Working condition)', item_name: 'ENTRANCE DOOR INSPECTION', section_code: 'SS1-C', ss1_flag: 'C', display_order: 132 },
            { text: 'Pivot (Top) (Working condition)', item_name: 'ENTRANCE DOOR INSPECTION', section_code: 'SS1-C', ss1_flag: '-', display_order: 133 },
            { text: 'Pivot (Bottom) (Working condition)', item_name: 'ENTRANCE DOOR INSPECTION', section_code: 'SS1-C', ss1_flag: '-', display_order: 134 },
            { text: 'Rubber Profile (End) (Well positioned)', item_name: 'ENTRANCE DOOR INSPECTION', section_code: 'SS1-C', ss1_flag: 'C', display_order: 135 },
            { text: 'Barrel Bolt (Locking arrangement) (Well positioned)', item_name: 'ENTRANCE DOOR INSPECTION', section_code: 'SS1-C', ss1_flag: 'C', display_order: 136 },
            { text: 'Latch handle (Top)', item_name: 'ENTRANCE DOOR INSPECTION', section_code: 'SS1-C', ss1_flag: 'C', display_order: 137 },
            { text: 'Latch handle (Bottom)', item_name: 'ENTRANCE DOOR INSPECTION', section_code: 'SS1-C', ss1_flag: 'C', display_order: 138 },

            // Lavatory (Mixed)
            { text: 'Mirror (Inside) (Dusty, Cracked,)', item_name: 'LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', display_order: 140 },
            { text: 'Wash basin (Stainless steel or FRP Painted, Clean)', item_name: 'LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', display_order: 141 },
            { text: 'Tap (Gravity tap / Luxury tap) (Working condition, Leakage)', item_name: 'LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', display_order: 142 },
            { text: 'Soap Dispenser (Working condition, Leakage)', item_name: 'LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', display_order: 143 },
            { text: 'Paper roller (Loose, deficient)', item_name: 'LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', display_order: 144 },
            { text: 'Hopper Window Glass (Condition of Rubber, Glass, Operation of Upper Glass, Locking arrangement of Upper Glass)', item_name: 'LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', display_order: 145 },
            { text: 'Dust Bin (under wash basin) (Stainless Steel or FRP (Painted))', item_name: 'LAVATORY', section_code: 'SS1-C', ss1_flag: 'C', display_order: 146 },
            { text: 'FRP Panels (Cracks, damaged, Condition of Paint, Shabby look (clean by soap water))', item_name: 'LAVATORY', section_code: 'SS1-C', ss1_flag: '-', display_order: 147 },
            { text: 'FRP Panels - Apply putty & paint the FRP Panels', item_name: 'LAVATORY', section_code: 'SS1-C', ss1_flag: '-', display_order: 148 },

            { text: 'Guide Roller Channel (Fixation, tightness)', item_name: 'LAVATORY DOOR', section_code: 'SS1-C', ss1_flag: 'C', display_order: 150 },
            { text: 'Pivot (Top) (Fixation, tightness)', item_name: 'LAVATORY DOOR', section_code: 'SS1-C', ss1_flag: 'C', display_order: 151 },
            { text: 'Pivot (Bottom) (Fixation, tightness)', item_name: 'LAVATORY DOOR', section_code: 'SS1-C', ss1_flag: 'C', display_order: 152 },
            { text: 'Top Roller (Fixation, tightness)', item_name: 'LAVATORY DOOR', section_code: 'SS1-C', ss1_flag: 'C', display_order: 153 },
            { text: 'Rubber Profile (Middle) (Condition)', item_name: 'LAVATORY DOOR', section_code: 'SS1-C', ss1_flag: 'C', display_order: 154 },
            { text: 'Rubber Profile (End) (Condition)', item_name: 'LAVATORY DOOR', section_code: 'SS1-C', ss1_flag: 'C', display_order: 155 },
            { text: 'Bottom Grill (Condition)', item_name: 'LAVATORY DOOR', section_code: 'SS1-C', ss1_flag: 'C', display_order: 156 },
            { text: 'Barrel Bolt (Locking arrangement) (Condition)', item_name: 'LAVATORY DOOR', section_code: 'SS1-C', ss1_flag: 'C', display_order: 157 },

            { text: 'Nylon Belt (Damaged, worn out)', item_name: 'VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', display_order: 160 },
            { text: 'Nylon Wire rope (Damaged, worn out)', item_name: 'VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', display_order: 161 },
            { text: 'M S Wire rope (Damaged, worn out)', item_name: 'VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', display_order: 162 },
            { text: 'Pivot (Top) (Fixation, tightness)', item_name: 'VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', display_order: 163 },
            { text: 'Pivot (Bottom) (Fixation, tightness)', item_name: 'VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', display_order: 164 },
            { text: 'Top Roller (Fixation, tightness)', item_name: 'VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', display_order: 165 },
            { text: 'Slide block (Fixation, tightness)', item_name: 'VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', display_order: 166 },
            { text: 'Stopper / Door catch (Fixation, tightness)', item_name: 'VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', display_order: 167 },
            { text: 'Glass & Rubber Profile (Cleanliness, Dusty, Cracked)', item_name: 'VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', display_order: 168 },
            { text: 'Rubber profile (Hand safe) (Condition)', item_name: 'VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', display_order: 169 },
            { text: 'Gangway bridge plate (Broken, damaged, fixing hook)', item_name: 'VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', display_order: 170 },
            { text: 'Falling plates (Fixation arrangement)', item_name: 'VESTIBULE SLIDING DOOR & GANGWAY BRIDGE', section_code: 'SS1-C', ss1_flag: 'C', display_order: 171 }
        ];

        console.log(`Seeding ${questions.length} questions with SS-I flags...`);
        const createdQs = await Question.bulkCreate(questions);

        // Add default reasons
        for (const q of createdQs) {
            const reasons = ['Broken', 'Missing', 'Loose', 'Damaged', 'Not Working', 'Leakage', 'Corroded', 'Worn Out', 'Bent'];
            await Reason.bulkCreate(reasons.map(r => ({ question_id: q.id, text: r })));
        }

        console.log('--- SS-I FILTER SEEDING COMPLETED ---');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
