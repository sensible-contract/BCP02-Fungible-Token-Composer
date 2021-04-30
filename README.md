# BCP02-Fungible-Token-Composer

This project can help you to generate a BCP02-Fungible-Token transaction template without signatures.
More info about BCP02-Fungible-Token please visit the repo <a href="https://github.com/sensing-contract/token_sensible/blob/master/docs/token_cn.md">token_sensible</a>

## Protocol

#### TokenGenesis

```
[code part](variable)
[data part](all 108 bytes)
	[specific data for proto_type](all 96 bytes)
		TokenName		(20 bytes) token name (e.g. Enjin)
		TokenSymbol 	(10 bytes) token symbol (e.g. Enj)
		GenesisFlag		(1 bytes)  genesis flag,unsigned int
		DecimalNum 	(1 bytes)  token amount decimal
		TokenAddress 	(20 bytes) token address
		TokenAmount  	(8 bytes)  token amount
		TokenID 		(36 bytes) composed of genesis's txid and outputIndex
	[proto header](all 12 bytes)
		ProtoType 		(4 bytes)  proto type.the default value is 1
		ProtoFlag 		(8 bytes)  static string 'sensible';
```

#### Token

```
[code part](variable)
[data part](all 108 bytes)
	[specific data for proto_type](all 96 bytes)
		TokenName		(20 bytes) token name (e.g. Enjin)
		TokenSymbol 	(10 bytes) token symbol (e.g. Enj)
		GenesisFlag		(1 bytes)  genesis flag,unsigned int
		DecimalNum 	(1 bytes)  token amount decimal
		TokenAddress 	(20 bytes) token address
		TokenAmount  	(8 bytes)  token amount
		TokenID 		(36 bytes) composed of genesis's txid and outputIndex
	[proto header](all 12 bytes)
		ProtoType 		(4 bytes)  proto type.the default value is 1
		ProtoFlag 		(8 bytes)  static string 'sensible';
```

#### TokenRouteCheck

```
[code part](variable)
[data part]
  TokenInputCount    (4 bytes) token inputs count
  ReceiverTokenAmountArray (8 bytes * n) the array of receiver's tokenAmount
  RecervierArray  (20 bytes * n) the array of receiver's tokenAddress
  ReceiverCount    (4 bytes) receivers count
  TokenCodeHash   (20 bytes) token contract code hash
  TokenID         (36 bytes) tokenID
```

## How to Build

```

npm install
npm gen-desc

```

## How to Run

To run the node , you at least need

- <a href="https://github.com/sensible-contract/satotx">satotx</a> support

Here is a example for config

```

src/config/signer.json
{
  "default": [
    {
      "satotxApiPrefix": "https://api.satotx.com",
      "satotxPubKey": "25108ec89eb96b99314619eb5b124f11f00307a833cda48f5ab1865a04d4cfa567095ea4dd47cdf5c7568cd8efa77805197a67943fe965b0a558216011c374aa06a7527b20b0ce9471e399fa752e8c8b72a12527768a9fc7092f1a7057c1a1514b59df4d154df0d5994ff3b386a04d819474efbd99fb10681db58b1bd857f6d5"
    },
    {
      "satotxApiPrefix": "https://api.satotx.com",
      "satotxPubKey": "25108ec89eb96b99314619eb5b124f11f00307a833cda48f5ab1865a04d4cfa567095ea4dd47cdf5c7568cd8efa77805197a67943fe965b0a558216011c374aa06a7527b20b0ce9471e399fa752e8c8b72a12527768a9fc7092f1a7057c1a1514b59df4d154df0d5994ff3b386a04d819474efbd99fb10681db58b1bd857f6d5"
    },
    {
      "satotxApiPrefix": "https://api.satotx.com",
      "satotxPubKey": "25108ec89eb96b99314619eb5b124f11f00307a833cda48f5ab1865a04d4cfa567095ea4dd47cdf5c7568cd8efa77805197a67943fe965b0a558216011c374aa06a7527b20b0ce9471e399fa752e8c8b72a12527768a9fc7092f1a7057c1a1514b59df4d154df0d5994ff3b386a04d819474efbd99fb10681db58b1bd857f6d5"
    }
  ],
  ...
}

```

and then just run

```

node src/app.js

```

or run in other settings

```

node src/app.js env=production

```

## How to Use

Every api return the Object({raw,outputs,sigtype}).
Use the function genSignedTx below in your project to sign with your privateKey and then broadcast

```
const { bsv, signTx } = require("scryptlib");
function genSignedTx(raw, outputs, sigtype, tokenPrivateKey, utxoPrivateKey) {
  const tx = new bsv.Transaction(raw);

  tx.inputs.forEach((input, inputIndex) => {
    input.output = new bsv.Transaction.Output({
      script: outputs[inputIndex].script,
      satoshis: outputs[inputIndex].satoshis,
    });
  });

  tx.inputs.forEach((input, inputIndex) => {
    if (input.script.toBuffer().length > 0) {
      let sig = signTx(
        tx,
        tokenPrivateKey,
        input.output.script.toASM(),
        input.output.satoshis,
        inputIndex,
        sigtype
      );
      let oldSigHex = Buffer.concat([
        Buffer.from("47", "hex"),
        Buffer.alloc(71, 0),
      ]).toString("hex");
      let newSigHex = Buffer.concat([
        Buffer.from(sig.length.toString(16), "hex"),
        sig,
      ]).toString("hex");
      input.setScript(input.script.toHex().replace(oldSigHex, newSigHex));
    } else {
      const sig = new bsv.Transaction.Signature({
        publicKey: utxoPrivateKey.publicKey,
        prevTxId: tx.inputs[inputIndex].prevTxId,
        outputIndex: tx.inputs[inputIndex].outputIndex,
        inputIndex,
        signature: bsv.Transaction.Sighash.sign(
          tx,
          utxoPrivateKey,
          sigtype,
          inputIndex,
          tx.inputs[inputIndex].output.script,
          tx.inputs[inputIndex].output.satoshisBN
        ),
        sigtype,
      });

      tx.inputs[inputIndex].setScript(
        bsv.Script.buildPublicKeyHashIn(
          sig.publicKey,
          sig.signature.toDER(),
          sig.sigtype
        )
      );
    }
  });
  return tx;
}
```

## <span id="apimethod">Api Method</span>

- [genesis](#genesis)
- [issue](#issue)
- [routeCheck](#routeCheck)
- [transfer](#transfer)

### <span id="genesis">genesis</span>

- params

| param         | required | type          | note                                             |
| ------------- | -------- | ------------- | ------------------------------------------------ |
| issuerPk      | true     | string        | the PublicKey of the Issuer                      |
| tokenName     | true     | string(20 B)  | the token name                                   |
| tokenSymbol   | true     | string(10 B)  | the token symbol                                 |
| decimalNum    | true     | number(UInt8) | the token amount decimal number bytes            |
| utxos         | true     | array         | e.g. [{txId:'xxxx',outputIndex:0,satoshis:1000}] |
| changeAddress | true     | string        | the change Address                               |
| feeb          | true     | number        | sat/B. the fee rate for this transaction         |
| network       | false    | string        | mainnet/testnet/regnet,default is mainnet        |

- req

```shell
curl -X POST  -H "Content-Type: application/json" --data '{
  "issuerPk": "0248513c73934f1ef1b138f173d20577b8bb10ab81da37721a60640dbb34a9703c",
  "tokenName": "ENJIN",
  "tokenSymbol": "ENJ",
  "decimalNum": 2,
  "utxos": [
    {
      "txId": "27b4fba771dcbdfa0591fe4bb9819b53a1041540898174e65ffd5b33e3cadde0",
      "satoshis": 2070486,
      "outputIndex": 1,
      "address":"18uoxg8VfRnLjgrbDmqL3VfbigvgkkU8e2",
    }
  ],
  "changeAddress": "18uoxg8VfRnLjgrbDmqL3VfbigvgkkU8e2",
  "feeb": 0.5,
  "network": "mainnet"
}' http://127.0.0.1:8091/genesis
```

- rsp

```json
{
  "code": 0,
  "msg": "",
  "data": {
    "raw": "xxxxxxxxx",
    "outputs": [
      {
        "satoshis": 2070486,
        "script": "76a91456c5b5ed917c31127030cd7ac695c5b73262f5d688ac"
      }
    ],
    "sigtype": 65
  }
}
```

### <span id="issue">issue</span>

- params

| param               | required | type   | note                                                 |
| ------------------- | -------- | ------ | ---------------------------------------------------- |
| genesisTxId         | true     | string | the txid of last token genesis/issue                 |
| genesisOutputIndex  | true     | number | the outputIndex of last token genesis/issue          |
| preUtxoTxId         | true     | string | the previous txid of last token genesis/issue        |
| preUtxoOutputIndex  | true     | number | the previous outputIndex of last token genesis/issue |
| preUtxoTxHex        | true     | string | the previous tx-hex-raw of last token genesis/issue  |
| spendByTxId         | true     | string | the previous txid of last token genesis/issue        |
| spendByOutputIndex  | true     | number | the previous outputIndex of last token genesis/issue |
| spendByTxHex        | true     | string | the previous tx-hex-raw of last token genesis/issue  |
| issuerPk            | true     | string | the PublicKey of the Issuer                          |
| receiverAddress     | true     | string | the address of the receiver                          |
| tokenAmount         | true     | string | the token amount to issue                            |
| allowIncreaseIssues | true     | bool   | allow to increase issues                             |
| signerSelecteds     | true     | array  | the signers choose to verify                         |
| utxos               | true     | array  | e.g. [{txId:'xxxx',outputIndex:0,satoshis:1000}]     |
| utxoAddress         | true     | string | the address of the utxos                             |
| feeb                | true     | number | sat/B. the fee rate for this transaction             |
| network             | false    | string | mainnet/testnet/regnet,default is mainnet            |

- req

```shell
curl -X POST -H "Content-Type: application/json" --data '{
  "genesisTxId": "0c1daf646aef2dc75dfd5016d02a96ef959e70f57647c0f48240fff0f85be453",
  "genesisOutputIndex": 0,
  "preUtxoTxId": "183531e430fba32119473bb95df53b86fb6fad27afe542542ade57bdf3187f8a",
  "preUtxoOutputIndex": 0,
  "preUtxoTxHex": "xxxxxxxx",
  "spendByTxId": "0c1daf646aef2dc75dfd5016d02a96ef959e70f57647c0f48240fff0f85be453",
  "spendByOutputIndex": 0,
  "spendByTxHex": "xxxxxx",
  "issuerPk": "0248513c73934f1ef1b138f173d20577b8bb10ab81da37721a60640dbb34a9703c",
  "receiverAddress": "18uoxg8VfRnLjgrbDmqL3VfbigvgkkU8e2",
  "tokenAmount": "100",
  "allowIncreaseIssues": true,
  "signerSelecteds": [0, 1],
  "utxos": [
    {
      "txId": "0df4c290b872724f7d3e281e3b2ce70b6d820ab2a784f0ed965c25d80b9344ca",
      "satoshis": 2065161,
      "outputIndex": 1,
      "changeAddress":"18uoxg8VfRnLjgrbDmqL3VfbigvgkkU8e2"
    }
  ],
  "changeAddress": "18uoxg8VfRnLjgrbDmqL3VfbigvgkkU8e2",
  "feeb": 0.5,
  "network": "mainnet"
}' http://127.0.0.1:8092/issue
```

- rsp

```json
{
  "code": 0,
  "msg": "",
  "data": {
    "raw": "xxxxxxxxxxxx",
    "outputs": [
      {
        "satoshis": 3177,
        "script": "xxxxxxxxx"
      },
      {
        "satoshis": 2065161,
        "script": "76a91456c5b5ed917c31127030cd7ac695c5b73262f5d688ac"
      }
    ],
    "sigtype": 65
  }
}
```

### <span id="routeCheck">routeCheck</span>

- params

| param          | required | type   | note                                                                                                                                                            |
| -------------- | -------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| senderPk       | true     | string | the PublicKey of sender                                                                                                                                         |
| receivers      | true     | array  | the address and token amount of the receivers e.g. [{address:'xxxx',amount:1000}]/issue                                                                         |
| ftUtxos        | true     | array  | the token utxos of sender e.g. [{txId:'',outputIndex:0,txHex:'',satoshis:1000,preTxId:'',preOutputIndex:0,preTxHex:'',preTokenAddress:'',preTokenAmount:1000,}] |
| routeCheckType | true     | string | "3To3"/"6To6"/"10To10"/"3To100"/"20To3" the token inputs count and token outputs count                                                                          |
| utxos          | true     | array  | e.g. [{txId:'xxxx',outputIndex:0,satoshis:1000}]                                                                                                                |
| utxoAddress    | true     | string | the address of the utxos                                                                                                                                        |
| feeb           | true     | number | sat/B. the fee rate for this transaction                                                                                                                        |
| network        | false    | string | mainnet/testnet/regnet,default is mainnet                                                                                                                       |

- req

```shell
curl -X POST -H "Content-Type: application/json" --data '{
  "senderPk": "0248513c73934f1ef1b138f173d20577b8bb10ab81da37721a60640dbb34a9703c",
  "receivers": [
    { "address": "13827KSuUPfRYb1qsBQ1UKGD9ByTnMTCZx", "amount": "1" }
  ],
  "ftUtxos": [
    {
      "genesisId": "28c5ef5da3afcc38ff626a97cb0f50af091c23122780eb07a9b263be12ac913c",
      "txId": "da88d0fe634d7096f0486b1df0f78b65865cb29b55fb0ce1aae250018ff09801",
      "satoshis": 5613,
      "outputIndex": 1,
      "txHex": "xxxxxxxxxx",
      "tokenAddress": "18uoxg8VfRnLjgrbDmqL3VfbigvgkkU8e2",
      "tokenAmount": "100",
      "preTxId": "28c5ef5da3afcc38ff626a97cb0f50af091c23122780eb07a9b263be12ac913c",
      "preOutputIndex": 0,
      "preTxHex": "xxxxxxxxxxx",
      "preTokenAddress": "18uoxg8VfRnLjgrbDmqL3VfbigvgkkU8e2",
      "preTokenAmount": 0
    }
  ],
  "routeCheckType": "3To3",
  "signerSelecteds": [0, 1],
  "utxos": [
    {
      "txId": "da88d0fe634d7096f0486b1df0f78b65865cb29b55fb0ce1aae250018ff09801",
      "satoshis": 1902341,
      "outputIndex": 2,
      "address":"18uoxg8VfRnLjgrbDmqL3VfbigvgkkU8e2"
    }
  ],
  "changeAddress": "18uoxg8VfRnLjgrbDmqL3VfbigvgkkU8e2",
  "feeb": 0.5,
  "network": "mainnet"
}' http://127.0.0.1:8091/routeCheck
```

- rsp

```json
{
  "code": 0,
  "msg": "",
  "data": {
    "raw": "xxxxxxxxxxxxxx",
    "outputs": [
      {
        "satoshis": 1902341,
        "script": "76a91456c5b5ed917c31127030cd7ac695c5b73262f5d688ac"
      }
    ],
    "sigtype": 65
  }
}
```

### <span id="transfer">transfer</span>

- params

| param           | required | type   | note                                                                                                                                                            |
| --------------- | -------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| senderPk        | true     | string | the PublicKey of sender                                                                                                                                         |
| receivers       | true     | array  | the address and token amount of the receivers e.g. [{address:'xxxx',amount:1000}]/issue                                                                         |
| ftUtxos         | true     | array  | the token utxos of sender e.g. [{txId:'',outputIndex:0,txHex:'',satoshis:1000,preTxId:'',preOutputIndex:0,preTxHex:'',preTokenAddress:'',preTokenAmount:1000,}] |
| routeCheckType  | true     | string | "3To3"/"6To6"/"10To10"/"3To100"/"20To3" the token inputs count and token outputs count                                                                          |
| routeCheckHex   | true     | string | the routeCheck tx-hex                                                                                                                                           |
| signerSelecteds | true     | array  | the signers choose to verify                                                                                                                                    |
| utxos           | true     | array  | e.g. [{txId:'xxxx',outputIndex:0,satoshis:1000}]                                                                                                                |
| utxoAddress     | true     | string | the address of the utxos                                                                                                                                        |
| feeb            | true     | number | sat/B. the fee rate for this transaction                                                                                                                        |
| network         | false    | string | mainnet/testnet/regnet,default is mainnet                                                                                                                       |

- req

```shell
curl -X POST -H "Content-Type: application/json" --data '{
  "senderPk": "0248513c73934f1ef1b138f173d20577b8bb10ab81da37721a60640dbb34a9703c",
  "receivers": [
    { "address": "13827KSuUPfRYb1qsBQ1UKGD9ByTnMTCZx", "amount": "1" }
  ],
  "ftUtxos": [
    {
      "genesisId": "28c5ef5da3afcc38ff626a97cb0f50af091c23122780eb07a9b263be12ac913c",
      "txId": "da88d0fe634d7096f0486b1df0f78b65865cb29b55fb0ce1aae250018ff09801",
      "satoshis": 5613,
      "outputIndex": 1,
      "txHex": "xxxxxxxxx",
      "tokenAddress": "18uoxg8VfRnLjgrbDmqL3VfbigvgkkU8e2",
      "tokenAmount": "100",
      "preTxId": "28c5ef5da3afcc38ff626a97cb0f50af091c23122780eb07a9b263be12ac913c",
      "preOutputIndex": 0,
      "preTxHex": "xxxxxxxx",
      "preTokenAddress": "18uoxg8VfRnLjgrbDmqL3VfbigvgkkU8e2",
      "preTokenAmount": 0
    }
  ],
  "routeCheckType": "3To3",
  "routeCheckHex": "xxxxxxx",
  "signerSelecteds": [0, 1],
  "utxos": [
    {
      "txId": "6e456b523c36983d8f34fdf16a193c0451dc6091bfb54b0f8661c36a106212a1",
      "satoshis": 1894397,
      "outputIndex": 1,
      "address":"18uoxg8VfRnLjgrbDmqL3VfbigvgkkU8e2"
    }
  ],
  "changeAddress": "18uoxg8VfRnLjgrbDmqL3VfbigvgkkU8e2",
  "feeb": 0.5,
  "network": "mainnet"
}' http://127.0.0.1:8091/transfer
```

- rsp

```json
{
  "code": 0,
  "msg": "",
  "data": {
    "raw": "xxxxxxxxxxxxxxxxxxxxx",
    "outputs": [
      {
        "satoshis": 5613,
        "script": "xxxxxxxxxxxxxx"
      },
      {
        "satoshis": 1894397,
        "script": "76a91456c5b5ed917c31127030cd7ac695c5b73262f5d688ac"
      },
      {
        "satoshis": 4749,
        "script": "xxxxxxxxxxxxxx"
      }
    ],
    "sigtype": 65
  }
}
```
