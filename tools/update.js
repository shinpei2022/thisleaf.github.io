// THANKS BY momemi : https://gist.github.com/X-20A/6e53f8a5181f1dcb7ec15159a402c891

(async () => {
    const ac_url = 'https://firebasestorage.googleapis.com/v0/b/development-74af0.appspot.com/o/master.json?alt=media';
    const sf_ships_url = 'https://raw.githubusercontent.com/shinpei2022/thisleaf.github.io/master/data/kancolle_shiplist.csv';
    const sf_items_url = 'https://raw.githubusercontent.com/shinpei2022/thisleaf.github.io/master/data/kancolle_equipment.csv';

    let ac_json = null;
    let sf_ships = null;
    let sf_items = null;

    let diff_array = [];

    try {
        // master.jsonの取得
        const acResponse = await fetch(ac_url);
        if (!acResponse.ok) throw new Error(`HTTPエラー: ${acResponse.status}`);
        ac_json = await acResponse.json();

        // らくらく支援艦隊改CSVの取得とJSON変換
        // 艦
        const sf_ships_response = await fetch(sf_ships_url);
        if (!sf_ships_response.ok) throw new Error(`HTTPエラー: ${sf_ships_response.status}`);
        sf_ships = csvToJSON(await sf_ships_response.text());

        // 装備
        const sf_items_response = await fetch(sf_items_url);
        if (!sf_items_response.ok) throw new Error(`HTTPエラー: ${sf_items_response.status}`);
        sf_items = csvToJSON(await sf_items_response.text());

        console.clear();
        console.log('The setting is complete.');
        console.log('docs()で利用可能な関数群を確認できます');
    } catch (error) {
        console.error('The setting failed:', error);
    }

    const ac_ships = ac_json.ships;
    const ac_items = ac_json.items;

    function findMissingShips() {
        return ac_ships.filter(ac_ship => !sf_ships.some(item => item.shipId == ac_ship.id)).map(ac_ship => ac_ship.name);
    }

    function findMissingItems() {
        console.log('sf_items', sf_items);
        return ac_items.filter(ac_item => !sf_items.some(item => item.number == ac_item.id || ac_item.id > 1500)).map(ac_item => ac_item.name);
    }

    function exportShips(orders) {
        if (!Array.isArray(orders)) throw new Error('配列で渡してください');
        const orders_length = orders.length;
        if (!orders_length) return;

        const res = [];
        console.group('ships\' url');
        for (let i = 0; i < orders_length; i++) {
            const order = orders[i];
            const ship = ac_ships.find((item) => item.name === order);
            if (!ship) {
                console.log(`no hit => ${order}`);
                continue;
            }

            const speed = ship.speed === 10 ? '高速' : '低速';
            let range = 0;
            switch (ship.range) {
                case 1:
                    range = '短';
                    break;
                case 2:
                    range = '中';
                    break;
                case 3:
                    range = '長';
                    break;
                case 4:
                    range = '超長';
                    break;
            }
            let upgrade = '';
            const before = ac_ships.find((item) => item.before === ship.id);
            if (before) {
                upgrade = `${before.name}(${ship.next_lv})`;
            }
            const new_json = {
                numberString: 'N' + ship.album,
                shipId: ship.id,
                rarity: undefined,
                name: ship.name,
                kana: ship.yomi,
                className: '<className>',
                classNumber: undefined,
                shipType: shipTypeToString(ship.type),
                shipTypeI: undefined,
                HP: ship.hp,
                firepowerMin: undefined,
                firepowerMax: ship.fire,
                armorMin: undefined,
                armorMax: undefined,
                torpedoMin: undefined,
                torpedoMax: undefined,
                evasion0: undefined,
                evasion99: undefined,
                antiairMin: undefined,
                antiairMax: undefined,
                aircraft: ship.slots.reduce((acc, num) => acc + num, 0),
                ASW0: undefined,
                ASW99: undefined,
                speed: speed,
                LoS0: ship.min_scout,
                LoS99: ship.scout,
                range: range,
                luckMin: ship.luck,
                luckMax: ship.max_luck,
                fuel: ship.fuel,
                ammo: ship.ammo,
                slot: ship.slots.length,
                space1: ship.slots[0] || 0,
                space2: ship.slots[1] || 0,
                space3: ship.slots[2] || 0,
                space4: ship.slots[3] || 0,
                space5: ship.slots[4] || 0,
                upgrade: upgrade,
                lastModified: getCurrentDate(),
            }

            res.push(new_json);
            console.log(`https://wikiwiki.jp/kancolle/${ship.name
                .replaceAll(' ', '%20') // スペースをエンコード
                .replaceAll('(', '%28') // ( をエンコード
                .replaceAll(')', '%29') // ) をエンコード
                }`);

        }
        console.groupEnd();
        console.log(jsonToCsv(res));
    }

    function exportItems(orders) {
        if (!Array.isArray(orders)) throw new Error('配列で渡してください');
        const orders_length = orders.length;
        if (!orders_length) return;

        const res = [];
        console.group('items\' url');
        for (let i = 0; i < orders_length; i++) {
            const order = orders[i];
            const item = ac_items.find((item) => item.name === order);

            if (!item) {
                console.log(`no hit => ${order}`);
                continue;
            }
            const equipable = searchEquipableShipTypes(item.type);

            const new_json = {
                number: item.id,
                rarityString: undefined,
                rarityStar: undefined,
                name: item.name,
                category: itemTypeToString(item.type),
                firepower: item.fire,
                torpedo: item.torpedo,
                bombing: item.bomber,
                antiair: item.antiAir,
                ASW: item.asw,
                LoS: item.scout,
                accuracy: item.accuracy,
                evasion: item.avoid,
                armor: item.armor,
                range: item.range,
                radius: item.radius,
                equipable: equipable,
                antibomber: item.antiBomber,
                interception: item.interception,
                improvement: '<improvement>',
                lastModified: getCurrentDate(),
            };
            res.push(new_json);
            console.log(`https://wikiwiki.jp/kancolle/${item.name
                .replaceAll(' ', '%20') // スペースをエンコード
                .replaceAll('(', '%28') // ( をエンコード
                .replaceAll(')', '%29') // ) をエンコード
                }`);

        }
        console.groupEnd();
        console.log(jsonToCsv(res));
    }

    function searchEquipable(orders) {
        if (!Array.isArray(orders)) throw new Error('配列で渡してください');
        const orders_length = orders.length;
        if (!orders_length) return;

        for (let i = 0; i < orders_length; i++) {
            const order = orders[i];
            const ac_item = ac_items.find((item) => item.name === order);
            if (!ac_item) throw new Error('装備が見つかりませんでした');
            const item_type_id = ac_item.type;
            const ship_types = searchEquipableShipTypes(item_type_id);
            const special_ships_ids = ac_json.api_mst_equip_ship
                .filter(item => item.api_equip_type.includes(item_type_id))
                .map(item => item.api_ship_id);
            const special_ships = ac_ships
                .filter(item => special_ships_ids.includes(item.id))
                .map(item => item.name);
            console.group(order);
            console.log('搭載可能艦種: ', ship_types);
            console.log('搭載可能艦: ', special_ships);
            console.log(`https://wikiwiki.jp/kancolle/${order
                .replaceAll(' ', '%20') // スペースをエンコード
                .replaceAll('(', '%28') // ( をエンコード
                .replaceAll(')', '%29') // ) をエンコード
                }`);
            console.groupEnd();
        }

    }

    function shipsDiff() {
        diff_array = [];
        for (let i = 0; i < ac_ships.length; i++) {
            const ac_ship = ac_ships[i];

            const sf_ship = sf_ships.find(item => item.shipId == ac_ship.id);
            if (!sf_ship) {
                console.log(`SupportFleetに不足: ${ac_ship.name}`);
                continue;
            }

            const ac_HP = ac_ship.hp;
            const ac_fire = ac_ship.fire;
            const ac_antiAir = ac_ship.anti_air;
            const ac_armor = ac_ship.armor;
            const ac_min_eva = ac_ship.min_avoid;
            const ac_max_eva = ac_ship.avoid;
            const ac_min_asw = ac_ship.min_asw;
            const ac_max_asw = ac_ship.asw;
            const ac_min_seek = ac_ship.min_scout;
            const ac_max_seek = ac_ship.scout;
            const ac_min_luck = ac_ship.luck;
            const ac_max_luck = ac_ship.max_luck;
            const ac_fuel = ac_ship.fuel;
            const ac_ammo = ac_ship.ammo;

            const sf_HP = sf_ship.HP;
            const sf_fire = sf_ship.firepowerMax;
            const sf_antiAir = sf_ship.antiairMax;
            const sf_armor = sf_ship.armorMax;
            const sf_min_eva = sf_ship.evasion0;
            const sf_max_eva = sf_ship.evasion99;
            const sf_min_asw = sf_ship.ASW0;
            const sf_max_asw = sf_ship.ASW99;
            const sf_min_seek = sf_ship.LoS0;
            const sf_max_seek = sf_ship.LoS99;
            const sf_min_luck = sf_ship.luckMin;
            const sf_max_luck = sf_ship.luckMax;
            const sf_fuel = sf_ship.fuel;
            const sf_ammo = sf_ship.ammo;

            if (sf_HP != ac_HP) {
                pushDiff(ac_ship.name, sf_HP, ac_HP, 'HP');
            }
            if (sf_fire != ac_fire) {
                pushDiff(ac_ship.name, sf_fire, ac_fire, 'firepowerMax');
            }
            if (sf_antiAir != ac_antiAir) {
                pushDiff(ac_ship.name, sf_antiAir, ac_antiAir, 'antiairMax');
            }
            if (sf_armor != ac_armor) {
                pushDiff(ac_ship.name, sf_armor, ac_armor, 'armorMax');
            }
            if (sf_min_eva != ac_min_eva) {
                pushDiff(ac_ship.name, sf_min_eva, ac_min_eva, 'evasion0');
            }
            if (sf_max_eva != ac_max_eva) {
                pushDiff(ac_ship.name, sf_max_eva, ac_max_eva, 'evasion99');
            }
            if (sf_min_asw != ac_min_asw) {
                pushDiff(ac_ship.name, sf_min_asw, ac_min_asw, 'ASW0');
            }
            if (sf_max_asw != ac_max_asw) {
                pushDiff(ac_ship.name, sf_max_asw, ac_max_asw, 'ASW99');
            }
            if (sf_min_seek != ac_min_seek) {
                pushDiff(ac_ship.name, sf_min_seek, ac_min_seek, 'LoS0');
            }
            if (sf_max_seek != ac_max_seek) {
                pushDiff(ac_ship.name, sf_max_seek, ac_max_seek, 'LoS99');
            }
            if (sf_min_luck != ac_min_luck) {
                pushDiff(ac_ship.name, sf_min_luck, ac_min_luck, 'luckMin');
            }
            if (sf_max_luck != ac_max_luck) {
                pushDiff(ac_ship.name, sf_max_luck, ac_max_luck, 'luckMax');
            }
            if (sf_fuel != ac_fuel) {
                pushDiff(ac_ship.name, sf_fuel, ac_fuel, 'fuel');
            }
            if (sf_ammo != ac_ammo) {
                pushDiff(ac_ship.name, sf_ammo, ac_ammo, 'ammo');
            }
        }
        if (diff_array.length === 0) {
            console.log('全て一致');
        } else {
            console.log(diff_array);
        }
    }

    function itemsDiff() {
        diff_array = [];
        for (let i = 0; i < ac_items.length; i++) {
            const ac_item = ac_items[i];

            if (ac_item.id > 1500) break;

            const sf_item = sf_items.find(item => item.number == ac_item.id);
            if (!sf_item) {
                console.log(`SupportFleetに不足: ${ac_item.name}`);
                continue;
            }

            const ac_fire = ac_item.fire;
            const ac_torpedo = ac_item.torpedo;
            const ac_bomber = ac_item.bomber;
            const ac_antiAir = ac_item.antiAir;
            const ac_asw = ac_item.asw;
            const ac_scout = ac_item.scout;
            const ac_accuracy = ac_item.accuracy;
            const ac_avoid = ac_item.avoid2;
            const ac_armor = ac_item.armor;
            const ac_range = ac_item.range;
            const ac_radius = ac_item.radius;
            const ac_antiBomber = ac_item.antiBomber;
            const ac_interception = ac_item.interception;

            const sf_firepower = sf_item.firepower;
            const sf_torpedo = sf_item.torpedo;
            const sf_bombing = sf_item.bombing;
            const sf_antiair = sf_item.antiair;
            const sf_ASW = sf_item.ASW;
            const sf_LoS = sf_item.LoS;
            const sf_accuracy = sf_item.accuracy;
            const sf_evasion = sf_item.evasion;
            const sf_armor = sf_item.armor;
            const sf_range = translateRange(sf_item.range);
            const sf_radius = sf_item.radius || 0;
            const sf_antibomber = sf_item.antibomber || 0;
            const sf_interception = sf_item.interception || 0;

            if (sf_firepower != ac_fire) {
                pushDiff(ac_item.name, sf_firepower, ac_fire, 'fire');
            }
            if (sf_torpedo != ac_torpedo) {
                pushDiff(ac_item.name, sf_torpedo, ac_torpedo, 'torpedo');
            }
            if (sf_bombing != ac_bomber) {
                pushDiff(ac_item.name, sf_bombing, ac_bomber, 'bombing');
            }
            if (sf_antiair != ac_antiAir) {
                pushDiff(ac_item.name, sf_antiair, ac_antiAir, 'antiair');
            }
            if (sf_ASW != ac_asw) {
                pushDiff(ac_item.name, sf_ASW, ac_asw, 'ASW');
            }
            if (sf_LoS != ac_scout) {
                pushDiff(ac_item.name, sf_LoS, ac_scout, 'LoS');
            }
            if (sf_accuracy != ac_accuracy) {
                pushDiff(ac_item.name, sf_accuracy, ac_accuracy, 'accuracy');
            }
            if (sf_evasion != ac_avoid) {
                pushDiff(ac_item.name, sf_evasion, ac_avoid, 'evasion');
            }
            if (sf_armor != ac_armor) {
                pushDiff(ac_item.name, sf_armor, ac_armor, 'armor');
            }
            if (sf_range != ac_range) {
                pushDiff(ac_item.name, sf_range, ac_range, 'range');
            }
            if (sf_radius != ac_radius) {
                pushDiff(ac_item.name, sf_radius, ac_radius, 'radius');
            }
            if (sf_antibomber != ac_antiBomber) {
                pushDiff(ac_item.name, sf_antibomber, ac_antiBomber, 'antibomber');
            }
            if (sf_interception != ac_interception) {
                pushDiff(ac_item.name, sf_interception, ac_interception, 'interception');
            }
        }
        if (diff_array.length === 0) {
            console.log('全て一致');
        } else {
            console.log(diff_array);
        }
    }

    // ここまでUI

    function docs() {
        console.log(`
            【関数】findMissingShips
            説明: らくらく支援艦隊改に無い艦を検索し、配列で返します
            引数: なし
            返り値: Array<String>

            【関数】findMissingItems
            説明: らくらく支援艦隊改に無い装備を検索し、配列で返します
            引数: なし
            返り値: Array<String>

            【関数】exportShips
            説明: 艦名を配列で受け取り、データをセットし、csvとして表示します
            引数: Array<String>
            返り値: なし

            【関数】exportItems
            説明: 装備名を配列で受け取り、データをセットし、csvとして表示します
            引数: Array<String>
            返り値: なし

            【関数】searchEquipable
            説明: 装備名を文字列で受け取り、搭載可能艦種と搭載可能艦を検索して表示します
            引数: Array<String>
            返り値: なし

            【関数】shipsDiff
            説明: 艦データについて、艦自体の不足と、パラメータの相違を表示します
            引数: なし
            返り値: なし

            【関数】itemsDiff
            説明: 装備データについて、装備自体の不足と、パラメータの相違を表示します
            引数: なし
            返り値: なし
            `);
    }

    function pushDiff(name, sf, ac, type) {
        const text = `${name} => ${type}[sf : ${sf}, ac : ${ac}]`;
        diff_array.push(text);
    }

    function translateRange(type) {
        let res = 0;
        switch (type) {
            case '短':
                res = 1;
                break;
            case '中':
                res = 2;
                break;
            case '長':
                res = 3;
                break;
            case '超長':
                res = 4;
                break;
        }
        return res;
    }

    function itemTypeToString(type) {
        // api_mst_slotitem_equiptype 
        const itemNames = {
            1: '小口径主砲',
            2: '中口径主砲',
            3: '大口径主砲',
            4: '副砲',
            5: '魚雷',
            6: '艦上戦闘機',
            7: '艦上爆撃機',
            8: '艦上攻撃機',
            9: '艦上偵察機',
            10: '水上偵察機',
            11: '水上爆撃機',
            12: '小型電探',
            13: '大型電探',
            14: 'ソナー',
            15: '爆雷',
            16: '追加装甲',
            17: '機関部強化',
            18: '対空強化弾',
            19: '対艦強化弾',
            20: 'VT信管',
            21: '対空機銃',
            22: '特殊潜航艇',
            23: '応急修理要員',
            24: '上陸用舟艇',
            25: 'オートジャイロ',
            26: '対潜哨戒機',
            27: '追加装甲(中型)',
            28: '追加装甲(大型)',
            29: '探照灯',
            30: '簡易輸送部材',
            31: '艦艇修理施設',
            32: '潜水艦魚雷',
            33: '照明弾',
            34: '司令部施設',
            35: '航空要員',
            36: '高射装置',
            37: '対地装備',
            38: '大口径主砲(II)',
            39: '水上艦要員',
            40: '大型ソナー',
            41: '大型飛行艇',
            42: '大型探照灯',
            43: '戦闘糧食',
            44: '補給物資',
            45: '水上戦闘機',
            46: '特型内火艇',
            47: '陸上攻撃機',
            48: '局地戦闘機',
            49: '陸上偵察機',
            50: '輸送機材',
            51: '潜水艦装備',
            52: '',
            53: '大型陸上機',
            56: '噴式戦闘機',
            57: '噴式戦闘爆撃機',
            58: '噴式攻撃機',
            59: '噴式偵察機',
            93: '大型電探(II)',
            94: '艦上偵察機(II)',
        };
        return itemNames[type] || '不明';
    }

    function shipTypeToString(type) {
        const shipNames = {
            1: '海防艦',
            2: '駆逐艦',
            3: '軽巡洋艦',
            4: '重雷装巡洋艦',
            5: '重巡洋艦',
            6: '航空巡洋艦',
            7: '軽空母',
            8: '巡洋戦艦',
            9: '戦艦',
            10: '航空戦艦',
            11: '正規空母',
            12: '超弩級戦艦',
            13: '潜水艦',
            14: '潜水空母',
            15: '補給艦', // 敵
            16: '水上機母艦',
            17: '揚陸艦',
            18: '装甲空母',
            19: '工作艦',
            20: '潜水母艦',
            21: '練習巡洋艦',
            22: '補給艦', // 味方
        };
        return shipNames[type] || '不明';
    }

    function translateShipType(types) {
        const replacements = {
            '海防艦': '',
            '駆逐艦': '駆逐',
            '軽巡洋艦': '軽巡',
            '重雷装巡洋艦': '',
            '重巡洋艦': '重巡',
            '航空巡洋艦': '',
            '軽空母': '軽母',
            '航空戦艦': '航戦',
            '正規空母': '空母',
            '超弩級戦艦': '戦艦',
            '潜水艦': '潜水',
            '潜水空母': '',
            '補給艦': '',
            '水上機母艦': '水母',
            '揚陸艦': '',
            '装甲空母': '',
            '工作艦': '',
            '潜水母艦': '',
            '練習巡洋艦': '',
            '補給艦': ''
        };
        const replaced_types = types.map(type =>
            Object.entries(replacements).reduce((acc, [key, value]) =>
                acc.replaceAll(key, value), type)
        );
        // 空文字と重複を削除
        return [...new Set(replaced_types.filter(str => str !== ''))];
    }

    function searchEquipableShipTypes(item_type_id) {
        return translateShipType(ac_json.api_mst_stype
            .filter(item => item.api_equip_type.includes(item_type_id))
            .map(item => item.api_name));
    }

    function csvToJSON(csvText) {
        const [headers, ...rows] = csvText.trim().split('\n').map(row => row.split(','));
        return rows.map(row => Object.fromEntries(headers.map((header, i) => [header, row[i]?.trim() || null])));
    }

    // JSON → CSV
    function jsonToCsv(jsonData) {
        if (!jsonData.length) return '';
        const headers = Object.keys(jsonData[0]);
        const csvRows = [
            headers.join(',') + ',', // ヘッダー行（末尾にカンマを追加）
            ...jsonData.map(row =>
                headers.map(header => row[header]).join(',') + ',' // データ行（末尾にカンマを追加）
            )
        ];
        const csvString = csvRows.join('\n');
        return csvString;
    }

    function getCurrentDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        return `${year}/${month}/${day}`;
    }

    // ユーザーが呼び出すもののみ設定
    window.findMissingShips = findMissingShips;
    window.findMissingItems = findMissingItems;
    window.exportShips = exportShips;
    window.exportItems = exportItems;
    window.searchEquipable = searchEquipable;
    window.shipsDiff = shipsDiff;
    window.itemsDiff = itemsDiff;
    window.docs = docs;
})();