import { AsyncStorage } from "react-native"

class databaseSingleton {
  constructor() {
    this.userTable = []
    this.messageTable = []
    this.messageUserMatrix = []
    this.userCount = 0
    this.messageCount = 0
    this.nowUserId = 0
    this.sendUserId = 1
    this.lastDrawMessageId = -1
  }

  // 起動時に実行する、保存データ読み込みorアカウント構築処理
  async doStart() {
    await this.load()
    if (this.userCount <= 0) {  // 本当は0以下にしたい
      this.userCount = 0;  this.saveUserData("user_zero" , "icon0.jpg", 100, 0);
      this.userCount += 1; this.saveUserData("user_one"  , "icon1.jpg", 100, 0);
      this.userCount += 1; this.saveUserData("user_two"  , "icon2.jpg", 100, 0);
      this.userCount += 1; this.saveUserData("user_three", "icon3.jpg", 100, 0);
      this.userCount += 1; this.saveUserData("user_four" , "icon4.jpg", 100, 0);
      this.userCount += 1; this.saveUserData("user_five" , "icon5.jpg", 100, 0);
      this.userCount += 1; this.saveUserData("user_six"  , "icon6.jpg", 100, 0);
    }
    this.nowUserId = await getNowUserId()
    return 0
  }

  // 保存データ読み込み
  async load() {
    let i = 0
    if (this.userCount == 0) {
      while (await getUserData(i, "userName") !== "") {
        // ユーザデータの取り出し
        const record = await Promise.all([
            getUserData(i, "userName"),
            getUserData(i, "imgName"),
            getUserData(i, "hasPoint"),
            getUserData(i, "getPoint")
          ]);
        this.userTable.push(record)
        i += 1
      }
      this.userCount = i
    }

    let j = 0
    if (this.messageCount == 0) {
      while (await getMessageData(j, "fromUserId") !== "") {
        // メッセージの取り出し
        const record = await Promise.all([
            getMessageData(j, "fromUserId"),
            getMessageData(j, "toUserId"),
            getMessageData(j, "messageText"),
            getMessageData(j, "postDate"),
            getMessageData(j, "clapCount")
          ]);
        this.messageTable.push(record)

        // メッセージに対する各ユーザの拍手回数の取り出し
        let promises = []
        for (k = 0; k < this.userCount; k++) {
          promises.push(getMessageData(j, "user" + k + "_clapCount"))
        }
        this.messageUserMatrix.push(await Promise.all(promises))
        j += 1
      }
      this.messageCount = j
    }
  }

  // 初期処理用 最初のユーザのポイント取得
  async getFirstUserPoint() {
    return await Promise.all([
      getUserData(0, 'hasPoint'),
      getUserData(0, 'getPoint')
    ])
  }

  // 列に対応する番号の検索
  getUserTableColumnNum(column) {
    switch (column) {
      case 'userName': return 0
      case 'imgName' : return 1
      case 'hasPoint': return 2
      case 'getPoint': return 3
    }
  }

  getMessageTableColumnNum(column) {
    switch (column) {
      case 'fromUserId' : return 0
      case 'toUserId'   : return 1
      case 'messageText': return 2
      case 'postDate'   : return 3
      case 'clapCount'  : return 4
    }
  }

  // ユーザ・メッセージマトリクスのキーから配列を特定し、代入する
  setMatrix(key, messageId, value) {
    let token  = key.slice(0, 4)
    let userId = key.slice(4, 5)
    if (token == "user") {
      this.messageUserMatrix[messageId][Number(userId)] = value
      return true
    } else {
      return false
    }  }


  // 1レコード分をまとめて新規保存
  saveUserData(userName, imgName, hasPoint, getPoint) {
    let id = this.userCount
    let prom = storeUserAllData(id, userName, imgName, hasPoint, getPoint)
    prom.then(() => {
      let record = [userName, imgName, hasPoint, getPoint]
      this.userTable.push(record)
      this.userCount += 1
    })
    return prom
  }

  saveMessageData(messageText, postDate, clapCount) {
    let id = this.messageCount
    let fromUserId = this.nowUserId
    let toUserId = this.sendUserId
    let prom = storeMessageAllData(id, fromUserId, toUserId, messageText, postDate, clapCount)
    prom.then(() => {
      let record = [fromUserId, toUserId, messageText, postDate, clapCount]
      this.messageTable.push(record)
      this.messageCount += 1
    })
    return prom
  }

  // 特定のレコードの特定要素を編集
  editUserData(id, column, value) {
    let prom = updateUserData(id, column, value)
    prom.then(() => {
      this.userTable[id][this.getUserTableColumnNum(column)] = value
    })
    return prom
  }

  editMessageData(id, column, value) {
    let prom = updateMessageData(id, column, value)
    prom.then(() => {
      if (!this.setMatrix(column, id, value)) {
        this.messageTable[id][this.getMessageTableColumnNum(column)] = value
      }
    })
    return prom
  }

  // 現在のユーザを変更
  changeUser(id) {
    let prom = storeNowUserId(id)
    prom.then(() => {
      this.nowUserId = id
    })
    return prom
  }
}

export default new databaseSingleton();

// 数値に変換するかどうか
function typeToNumWithJudging(column, value) {
  switch (column) {
    case 'userName'   : return value
    case 'imgName'    : return value
    case 'hasPoint'   : return value === "" ? "" : Number(value)
    case 'getPoint'   : return value === "" ? "" : Number(value)
    case 'fromUserId' : return value === "" ? "" : Number(value)
    case 'toUserId'   : return value === "" ? "" : Number(value)
    case 'messageText': return value
    case 'postDate'   : return value
    case 'clapCount'  : return value === "" ? "" : Number(value)
    default           : return value === "" ? 0  : Number(value)
  }
}

async function storeUserAllData(id, userName, imgName, hasPoint, getPoint) {
  // ユーザデータの格納
  idstr = id + "_user_"
  try {
    console.log('storeUserAllData ' + idstr)
    await Promise.all([
      AsyncStorage.setItem(idstr + 'userName', String(userName)),
      AsyncStorage.setItem(idstr + 'imgName' , String(imgName)),
      AsyncStorage.setItem(idstr + 'hasPoint', String(hasPoint)),
      AsyncStorage.setItem(idstr + 'getPoint', String(getPoint)),
    ])
  } catch (error) {
    console.log(error)
  }
}

async function updateUserData(id, column, value) {
  // ユーザデータの一部格納
  idstr = id + "_user_"
  try {
    console.log('updateUserData ' + idstr + column)
    await AsyncStorage.setItem(idstr + column, String(value))
  } catch (error) {
    console.log(error)
  }
}

async function getUserData(id, column) {
  // ユーザデータの読み込み
  idstr = id + "_user_"
  try {
    console.log('getUserData ' + idstr + column)
    const value = await AsyncStorage.getItem(idstr + column)
    if (!!value) {
      return typeToNumWithJudging(column, value)
    } else {
      return typeToNumWithJudging(column, "")
    }
  } catch (error) {
    console.log(error)
    return typeToNumWithJudging(column, "")
  }
}

async function storeMessageAllData(id, fromUserId, toUserId, messageText, postDate, clapCount) {
  // メッセージデータの格納
  idstr = id + "_message_"
  try {
    console.log('storeMessageAllData ' + idstr)
    await Promise.all([
      AsyncStorage.setItem(idstr + 'fromUserId' , String(fromUserId)),
      AsyncStorage.setItem(idstr + 'toUserId'   , String(toUserId)),
      AsyncStorage.setItem(idstr + 'messageText', String(messageText)),
      AsyncStorage.setItem(idstr + 'postDate'   , String(postDate)),
      AsyncStorage.setItem(idstr + 'clapCount'  , String(clapCount)),
    ])
  } catch (error) {
    console.log(error)
  }
}

async function updateMessageData(id, column, value) {
  // メッセージデータの一部格納
  idstr = id + "_message_"
  try {
    console.log('updateMessageData ' + idstr + column)
    await AsyncStorage.setItem(idstr + column, String(value))
  } catch (error) {
    console.log(error)
  }
}

async function getMessageData(id, column) {
  // メッセージデータの読み込み
  idstr = id + "_message_"
  try {
    console.log('getMessageData ' + idstr + column)
    const value = await AsyncStorage.getItem(idstr + column)
    if (!!value) {
      return typeToNumWithJudging(column, value)
    } else {
      return typeToNumWithJudging(column, "")
    }
  } catch (error) {
    console.log(error)
    return typeToNumWithJudging(column, "")
  }
}

async function storeNowUserId(id) {
  // 現在のユーザIDの格納
  tag = "now_user"
  try {
    await AsyncStorage.setItem(tag, String(id))
  } catch (error) {
    console.log(error)
  }
}

async function getNowUserId() {
  // 現在のユーザIDの読み込み
  tag = "now_user"
  try {
    const value = Number(await AsyncStorage.getItem(tag))
    if (!!value) {
      return value
    } else {
      // 保存されていないなら0番のユーザを指定
      return 0
    }
  } catch (error) {
    console.log(error)
    return 0
  }
}
