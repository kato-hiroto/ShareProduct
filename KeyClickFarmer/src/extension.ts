'use strict';
import {window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, OutputChannel} from 'vscode';
var fs = require('fs');
var path = require('path');

// エディタ起動時（アクティベート時）の処理
export function activate(context: ExtensionContext) {
    console.log('Congratulations, your extension "keyclickfarmer" is now active!');

    let wordCounter = new WordCounter();
	wordCounter.load();

    let controller = new WordCounterController(wordCounter);
    let autoTimer = new AutoTimer(wordCounter);
    let powerupButton = commands.registerCommand('extension.keyclickfarmer-powerup', () => {
        wordCounter.addPower();
    });
    let infoButton = commands.registerCommand('extension.keyclickfarmer-info', () => {
        wordCounter.showInfo();
    });

    context.subscriptions.push(infoButton);
    context.subscriptions.push(powerupButton);
    context.subscriptions.push(autoTimer);
    context.subscriptions.push(controller);
    context.subscriptions.push(wordCounter);

    autoTimer.startTimer();
}


// 一定時間ごとに自動実行
class AutoTimer {

    private _wordCounter: WordCounter;
    private _disposable: Disposable;

    constructor(wordCounter: WordCounter) {
        this._wordCounter = wordCounter;
        let subscriptions: Disposable[] = [];
        this._disposable = Disposable.from(...subscriptions);
    }

    public startTimer(){
        setInterval(() => {
            this._wordCounter.autoAddPt();
        }, 1000);
    }

    dispose() {
        this._disposable.dispose();
    }
}


// タイプ数のカウントなど
class WordCounter {

    private _statusBarInfo: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
	private _statusBarItem: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
	private _overview: OutputChannel = window.createOutputChannel("keyclick-output");
    private _keyCount: number = 0;
    private _pt: number = 0;
    private _allpt: number = 0;
    private _power: number = 1;
    private _unit: number = 0;
	private _energy_max = 10800;
    private _energy: number = this._energy_max;

    private addPt(pt: number) {
        // ポイント加算を効率よくやる
        this._pt += pt;
        this._allpt += pt;
    }

    private addComma(value: number, fix: boolean = true) : string{
        // 数値にコンマをつけて表示
        return String(fix ? value.toFixed(2) : value).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
    }

    private unit(before : boolean = false) : string{
        // 現在の単位を計算する
        let U_str = "";
        for (let i = (before ? 1 : 0); i < this._unit; i += 1) {
            U_str += "U";
        }
        return U_str + "pt";
    }

    public updateWordCount() {
        // 現在のテキストエディタを取得
        let editor = window.activeTextEditor;
        if (!editor) {
            this._statusBarItem.hide();
            return;
        }
        //let doc = editor.document;

        // ステータスの変更
        this._keyCount += 1;
        this.addPt(this._power);
        this._energy += 10;
        if (this._energy > this._energy_max) {
            this._energy = this._energy_max;
        }
        this.showStatus();
    }

    public autoAddPt() {
        // 自動ポイント加算
        if (this._energy > 0) {
            this.addPt(this._power);
            this._energy -= 1;
        }
        this.showStatus();
    }

    public showInfo(){
        // infoボタンを押したときの表示
        let mes0 = `>> KeyClick Farmer Status Infomation\n`;
        let mes1 = ` Key Counter : ${this.addComma(this._keyCount, false)} types\n`;
        let mes2 = ` Point       : ${this.addComma(this._pt)} ${this.unit()}\n`;
        let mes3 = ` Point All   : ${this.addComma(this._allpt)} ${this.unit()}\n`;
        let mes4 = ` Now Power   : ${this.addComma(this._power)} ${this.unit()}/type\n`;
        let mes5 = ` Energy      : ${this.addComma(this._energy, false)} sec | ${(this._energy * 100 / this._energy_max).toFixed(2)}%\n`;
        let mes6 = ` Unit Size   : ${this.addComma(this._unit + 1, false)}\n`;
		window.showInformationMessage("Look at the Output Window.");
		this._overview.clear();
		this._overview.append(mes0 + mes1 + mes2 + mes3 + mes4 + mes5 + mes6);
		this._overview.show(true);
        //console.info(mes0, mes1, mes2, mes3, mes4, mes5, mes6);
    }

    public addPower(){
        // PowerUPボタンを押したとき
        let pt = this._pt;
        let u = this._unit;
        let cost = 100;
        let digit = 0;
        let power = 0.01;

        // 倍率計算
        while (pt >= 1000) {
            pt = Math.floor(pt / 10);
            cost *= 10;
            digit += 1;
            if (digit < 6 && (digit % (1 + u) === 0)) {
                power *= 20;
            } else if (digit < 16 && (digit % (2 + u) === 0)) {
                power *= 20;
            } else if (digit < 36 && (digit % (4 + u) === 0)) {
                power *= 20;
            } else {
                power *= 10;
            }
        }

        // ポイント消費
        if (this._pt >= cost) {
            this._pt -= cost;
            this._power += power;
            let mes1 = `>> Power up!\n`;
            let mes2 = ` Cost : -${this.addComma(cost)} ${this.unit()}\n`;
            let mes3 = `  -> Power : +${this.addComma(power)} ${this.unit()}/type\n`;
            if (digit >= 36) {
                // ptの単位系を 10^36 する
                this._unit += 1;
                this._power /= Math.pow(10, 36);
                this._pt /= Math.pow(10, 36);
                this._allpt /= Math.pow(10, 36);
                let mes4 = `\n`;
                let mes5 = `>> Unit changed. 'U' means 10^36.\n`;
                let mes6 = ` ${this.unit(true)} -> ${this.unit()}\n`;
				window.showInformationMessage("Exchange success. Your points have exceeded ultimate dimension!");
				this._overview.clear();
				this._overview.append(mes1 + mes2 + mes3 + mes4 + mes5 + mes6);
				this._overview.show(true);

            } else {
                // 通常消費
                window.showInformationMessage("Exchange success. Look at the Output Window.");
				this._overview.clear();
				this._overview.append(mes1 + mes2 + mes3);
				this._overview.show(true);
            }
        } else {
            // ptが100未満
            window.showInformationMessage("Oops! Your point is less than exchangeable points.");
        }
        this.showStatus();
    }

    public save() {
        let obj = {
            keyCount: this._keyCount,
            Point:    this._pt,
            allPoint: this._allpt,
            Power:    this._power,
            Energy:   this._energy,
            Unit:     this._unit,
        };
        let json = JSON.stringify(obj);
        fs.writeFile(path.resolve(__dirname, '../../keyclickfarmer-savedata.json'), json, 'utf8', (err : Error) => {
            if (err) {
                window.showErrorMessage(err.message);
                console.log(err);
            }
        });
    }

    public load() {
        try {
            let config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../keyclickfarmer-savedata.json'), 'utf8'));
            this._keyCount  = config.keyCount;
            this._pt        = config.Point;
            this._allpt     = config.allPoint;
            this._power     = config.Power;
            this._energy    = config.Energy;
            this._unit      = config.Unit;
        } catch (e){
            console.log(e);
            console.log(">> Make savedata.\n");
            this.save();
		}
		this.showStatus();
    }

    public showStatus() {
        // ステータスバーの表示
        this._statusBarItem.text = `$(chevron-down) ${this._pt.toFixed(2)} ${this.unit()}`;
        this._statusBarItem.command = "extension.keyclickfarmer-powerup";
        this._statusBarItem.show();
        this._statusBarInfo.text = `$(info)`;
        this._statusBarInfo.command = "extension.keyclickfarmer-info";
        this._statusBarInfo.show();
        this.save();
    }

    dispose() {
        this._statusBarItem.dispose();
    }
}


// キー入力が入ったとき，updateWordCount()を実行する
class WordCounterController {

    private _wordCounter: WordCounter;
    private _disposable: Disposable;

    constructor(wordCounter: WordCounter) {
        this._wordCounter = wordCounter;

        let subscriptions: Disposable[] = [];
        window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
        window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);

        this._disposable = Disposable.from(...subscriptions);
    }

    dispose() {
        this._disposable.dispose();
    }

    private _onEvent() {
        this._wordCounter.updateWordCount();
	}
}