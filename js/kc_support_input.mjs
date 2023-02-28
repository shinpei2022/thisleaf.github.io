// 入力と入力用ダイアログ

import * as Global from "./kc_support_global.mjs";
import * as Util from "./utility.mjs";
import {NODE, ELEMENT, TEXT, EL, _T} from "./utility.mjs";
import {EquipmentDatabase} from "./kc_equipment.mjs";
import {SupportShipData} from "./kc_support_ship.mjs";
import {DOMDialog} from "./dom_dialog.mjs";

export {
	InputDeckDialog,
};


// InputDeckDialog --------------------------------------------------------------------------------
class InputDeckDialog extends DOMDialog {
	// DOM
	e_select;
	selects;
	e_support_copy;
	e_textarea_A;
	e_main_paste;
	e_textarea_B;
	e_log_clear;
	e_textarea_log;
	e_close;
	
	// データ
	fleets;
	error_names;
	
	constructor(fleets){
		super();
		this.fleets = fleets;
	}
};

Object.defineProperties(InputDeckDialog.prototype, {
	create                   : {value: InputDeckDialog_create},
	fleet_to_json_deckbuilder: {value: InputDeckDialog_fleet_to_json_deckbuilder},
	
	input_support            : {value: InputDeckDialog_input_support},
	log                      : {value: InputDeckDialog_log},
	clear_log                : {value: InputDeckDialog_clear_log},
	
	ev_show_dialog           : {value: InputDeckDialog_ev_show_dialog},
	ev_click_support_copy    : {value: InputDeckDialog_ev_click_support_copy},
	ev_click_main_paste      : {value: InputDeckDialog_ev_click_main_paste},
	ev_click_log_clear       : {value: InputDeckDialog_ev_click_log_clear},
});

Object.defineProperties(InputDeckDialog, {
	select_enum: {value: {
		"デッキビルダー": 1,
	}},
	infleet_select_enum: {value: {
		"/1 /2": 12,
		"/2 /3": 23,
		"/3 /4": 34,
		"/2 /4": 24,
		"カスタムデータ": 1,
	}},
});


function InputDeckDialog_create(){
	DOMDialog.prototype.create.call(this, "modal", "データの入力", true);
	
	this.e_inside.classList.add("convert");
	this.e_inside.classList.add("input");
	
	NODE(this.e_contents, [
		NODE(ELEMENT("div"), [
			this.e_select = NODE(ELEMENT("select", "", "data_type"), [
				new Option("デッキビルダー", InputDeckDialog.select_enum["デッキビルダー"]),
			]),
		]),
		
		this.e_infleet_div = EL("div"),

		NODE(ELEMENT("div"), [
			NODE(ELEMENT("div", "", "column_div"), [
				NODE(ELEMENT("div", "", "tool_div"), [
					NODE(ELEMENT("div", "", "f_left"), [
						TEXT("支援艦隊A"),
					]),
					NODE(ELEMENT("div", "", "f_right"), [
						this.e_support_copy = ELEMENT("button", {textContent: "コピー"}),
					]),
				]),
				this.e_textarea_A = ELEMENT("textarea", {className: "code_area", placeholder: "デッキビルダー形式のデータを入力"}),
			]),
			
			NODE(ELEMENT("div", "", "column_div"), [
				NODE(ELEMENT("div", "", "tool_div"), [
					NODE(ELEMENT("div", "", "f_left"), [
						TEXT("支援艦隊B"),
					]),
					NODE(ELEMENT("div", "", "f_right"), [
						this.e_main_paste = ELEMENT("button", {textContent: "貼り付け"}),
					]),
				]),
				this.e_textarea_B = ELEMENT("textarea", {className: "code_area", placeholder: "デッキビルダー形式のデータを入力"}),
			]),
		]),

        NODE(ELEMENT("div"), [
			NODE(ELEMENT("div", "", "column_div"), [
				NODE(ELEMENT("div", "", "tool_div"), [
					NODE(ELEMENT("div", "", "f_left"), [
						TEXT("ログ"),
					]),
					NODE(ELEMENT("div", "", "f_right"), [
						this.e_log_clear = ELEMENT("button", {textContent: "クリア"}),
					]),
				]),
				this.e_textarea_log = ELEMENT("textarea", "", "code_area"),
			]),
		]),
		
		NODE(ELEMENT("div", "", "button_div"), [
			this.e_close = ELEMENT("button", {textContent: "閉じる"}),
		]),
	]);

	let selects = [];
	NODE(this.e_infleet_div, [_T("入力する艦隊")]);
	for (let i=0; i<2; i++) {
		NODE(this.e_infleet_div, [
			EL("span.fleetnumber", [_T("/" + (i + 1))]),
			selects[i] = EL("select.fleetname"),
		]);
		selects[i].appendChild(new Option("-", -1));
		for (let j=0; j<this.fleets.length; j++) {
			selects[i].appendChild(new Option(this.fleets[j].get_fleet_name(), j));
		}
	}
	NODE(this.e_infleet_div, [
		this.e_input = EL("button.out", [_T("入力")])
	]);
	selects[0].selectedIndex = 1;
	// if (this.fleets.length >= 2) selects[1].selectedIndex = 2;
	this.selects = selects;

	// event
	for (let sel of this.selects) sel.addEventListener("change", e => this.input_support());
	this.e_input.addEventListener("click", e => this.input_support());
	this.addEventListener("show", e => this.ev_show_dialog(e));
	this.e_support_copy.addEventListener("click", e => this.ev_click_support_copy());
	this.e_main_paste.addEventListener("click", e => this.ev_click_main_paste());
	this.e_log_clear.addEventListener("click", e => this.ev_click_log_clear());
	this.add_dialog_button(this.e_close, "ok");
}


function InputDeckDialog_fleet_to_json_deckbuilder(fleet, error_names){
	let json = {};
	// json.name = fleet.get_fleet_name(true);
	
	for (let s=0; s<fleet.support_ships.length; s++) {
		let sup = fleet.support_ships[s];
		
		if (!sup.empty()) {
			let ssd = sup.get_ssd();
			if (!ssd.empty()) {
				let ssd_json = ssd.get_json_deckbuilder();
				json["s" + (s + 1)] = ssd_json;
				
				if (error_names && ssd_json.id == "0") {
					// 内部IDが未定義だった
					error_names.push(ssd.ship_name);
				}
			}
		}
	}
	return json;
}


// ログを入力
function InputDeckDialog_log(log){
	this.e_textarea_log.value += log + "\n";
}
// クリア
function InputDeckDialog_clear_log(){
	this.e_textarea_log.value = "";
}

// 左上を入力
function InputDeckDialog_input_support(){
	this.error_names = [];

	let json = {version: 4};
	let fnames = [];
	for (let i=0; i<this.selects.length; i++) {
		let index = +this.selects[i].value;
		if (index >= 0) {
			json["f" + (i + 1)] = this.fleet_to_json_deckbuilder(this.fleets[index], this.error_names);
			fnames.push("/" + (i + 1) + ":" + this.fleets[index].get_fleet_name());
		}
	}
	this.e_textarea_A.value = JSON.stringify(json);

	this.log("支援艦隊データ 入力 (" + fnames.join(" ") + ")");
	if (this.error_names.length > 0) {
		this.log("注意: " + this.error_names.join(", ") + "の内部IDが入力されていません (ID:\"0\"で入力します)");
	}
}


function InputDeckDialog_ev_show_dialog(e){
	this.input_support();
	this.move_to(this.get_max_x() / 2, this.get_max_y() / 2);
}

function InputDeckDialog_ev_click_support_copy(){
	if (this.e_textarea_A.value == "") {
		this.log("データが空です");
		
	} else {
		Util.copy_form_text(this.e_textarea_A, true, true)
		.then(result => {
			if (result.state == "granted") {
				this.log("Aのデータをコピーしました");
			} else {
				this.log("コピーに失敗しました...");
			}
		});
	}
}

function InputDeckDialog_ev_click_main_paste(){
	Util.paste_form_text(this.e_textarea_B, true, true)
	.then(result => {
		if (result.state == "granted") {
			this.log("Bにデータを貼り付けました");
		} else {
			let mes = "貼り付けに失敗しました...";
			if (/\bFirefox\b/i.test(navigator.userAgent)) {
				mes += "(Firefoxは無理かも)";
			}
			this.log(mes);
		}
	});
}

function InputDeckDialog_ev_click_log_clear(){
	this.clear_log();
}

