# Photonであそぼ 2018-09-10 LT用プロジェクト

## 概要
スライドをPhotonネットワークで同期します。  
ルームマスターが表示しているスライド画面を、他の端末にも表示します。

## プロジェクトファイル
- PhotonLT_IncludePlugins.unitypackage
  - PhotonのAppIDを取得後、Unityにインポートするだけで実行可能です。
  - [Photon Unity Network](https://www.assetstore.unity3d.com/jp/#!/content/1786) を含みます。
  
- PhotonLT_OriginalPart.unitypackage
  - 私が自作したファイルのみ含みます。
  - [Photon Unity Network](https://www.assetstore.unity3d.com/jp/#!/content/1786) は含みません。
  - 使用する際はAppIDの取得に加え、上記アセットをインポートしてください。
  - さらにResourcesフォルダのオブジェクト『Slide』を図のように設定してください。

  ![SlideInspector](https://raw.githubusercontent.com/kato-hiroto/ShareProduct/master/SlideSync/Inspector.png)

  - その他微修正が必要な場合があります。
  
## スライドの変更
- 各ページの画像が必要です。画像サイズは1280×720です。
  - PowerPointの場合は、スライドをまとめてpng画像化できます。
- 画像をすべてUnityにインポートします。
- 画像をすべてSprite形式にします。画質はなるべく高めが良いです。
- Resourcesフォルダのオブジェクト『Slide』の孫オブジェクト『Selector』に、画像をすべてアタッチします。
  - すると自動的にアニメーションが作成されるはずです。
  - このアニメーションをコマ送りして、スライド操作を実装しています。

## 実行
- 再生すると、自動的にサーバへ接続します。
- その後スライドが自動的に表示されます。
- ルームマスターは左右へのスワイプでスライド画像を変更できます。
  - クライアントはルームマスターと同じ画像が表示されます。
- それ以外のクライアントはダブルタップでサーバから切断します。
- 再接続ボタンでサーバからの切断・再接続が可能です。
  - 接続時はサーバから切断、非接続時はサーバへ接続開始、といった挙動をとります。
