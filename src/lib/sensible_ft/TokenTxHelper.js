const { bsv, Bytes, toHex } = require("scryptlib");
const TokenUtil = require("./tokenUtil");
const { ScriptHelper } = require("./ScriptHelper");
const { FungibleToken, sighashType } = require("./FungibleToken");
const TokenProto = require("./tokenProto");
const { toBufferLE } = require("bigint-buffer");

class TokenTxHelper {
  static getVinsOutputs(tx) {
    let outputs = [];
    for (let i = 0; i < tx.inputs.length; i++) {
      let output = tx.inputs[i].output;
      outputs.push({
        satoshis: output.satoshis,
        script: output.script.toHex(),
      });
    }
    return outputs;
  }

  static async genesis({
    satotxPubKeys,

    issuerPk,
    tokenName,
    tokenSymbol,
    decimalNum,

    utxos,
    utxoAddress,
    feeb,
    network = "mainnet",
  }) {
    utxoAddress = new bsv.Address(utxoAddress, network);
    issuerPk = new bsv.PublicKey(issuerPk);

    let ft = new FungibleToken(
      BigInt("0x" + satotxPubKeys[0]),
      BigInt("0x" + satotxPubKeys[1]),
      BigInt("0x" + satotxPubKeys[2])
    );

    //create genesis contract
    let genesisContract = ft.createGenesisContract(issuerPk, {
      tokenName,
      tokenSymbol,
      decimalNum,
    });

    //create genesis tx
    let tx = ft.createGenesisTx({
      utxos,
      utxoAddress,
      feeb,
      genesisContract,
    });

    return {
      raw: tx.serialize(),
      outputs: this.getVinsOutputs(tx),
      sigtype: sighashType,
    };
  }

  static async issue({
    satotxPubKeys,

    genesisTxId,
    genesisOutputIndex,
    preUtxoTxId,
    preUtxoOutputIndex,
    preUtxoTxHex,
    spendByTxId,
    spendByOutputIndex,
    spendByTxHex,

    issuerPk,
    receiverAddress,
    tokenAmount,
    allowIncreaseIssues,
    oracleSelecteds,

    utxos,
    utxoAddress,
    feeb,
    network = "mainnet",
  }) {
    utxoAddress = new bsv.Address(utxoAddress, network);
    issuerPk = new bsv.PublicKey(issuerPk);
    receiverAddress = new bsv.Address(receiverAddress, network);
    tokenAmount = BigInt(tokenAmount);

    let ft = new FungibleToken(
      BigInt("0x" + satotxPubKeys[0]),
      BigInt("0x" + satotxPubKeys[1]),
      BigInt("0x" + satotxPubKeys[2])
    );

    const preIssueTx = new bsv.Transaction(spendByTxHex);
    const genesisLockingScript = preIssueTx.outputs[spendByOutputIndex].script;

    let oracleDataObj = TokenProto.parseOracleData(
      genesisLockingScript.toBuffer()
    );
    let genesisContract = ft.createGenesisContract(issuerPk);
    const oracleData = TokenProto.newOracleData(oracleDataObj);
    genesisContract.setDataPart(oracleData.toString("hex"));

    let tokenContract = ft.createTokenContract(
      genesisTxId,
      genesisOutputIndex,
      genesisContract,
      {
        receiverAddress,
        tokenAmount,
      }
    );

    let tx = await ft.createIssueTx({
      genesisContract,

      genesisTxId,
      genesisOutputIndex,
      genesisLockingScript,

      utxos,
      utxoAddress,
      feeb,
      issuerPk,

      tokenContract,
      allowIncreaseIssues,
      satotxData: {
        index: preUtxoOutputIndex,
        txId: preUtxoTxId,
        txHex: preUtxoTxHex,
        byTxId: spendByTxId,
        byTxHex: spendByTxHex,
      },
      oracleSelecteds,
    });

    return {
      raw: tx.serialize(),
      outputs: this.getVinsOutputs(tx),
      sigtype: sighashType,
    };
  }

  static async routeCheck({
    satotxPubKeys,

    senderPk,
    receivers,
    ftUtxos,
    routeCheckType,

    utxos,
    utxoAddress,
    feeb,
    network = "mainnet",
  }) {
    utxoAddress = new bsv.Address(utxoAddress, network);
    senderPk = new bsv.PublicKey(senderPk);
    ftUtxos.forEach((v) => {
      v.tokenAmount = BigInt(v.tokenAmount);
      v.preTokenAmount = BigInt(v.preTokenAmount);
    });

    let ft = new FungibleToken(
      BigInt("0x" + satotxPubKeys[0]),
      BigInt("0x" + satotxPubKeys[1]),
      BigInt("0x" + satotxPubKeys[2])
    );

    let tokenOutputArray = receivers.map((v) => ({
      address: new bsv.Address(v.address, network),
      tokenAmount: BigInt(v.amount),
    }));

    let routeCheckContract;

    let inputTokenAmountSum = ftUtxos.reduce(
      (pre, cur) => pre + cur.tokenAmount,
      0n
    );
    let outputTokenAmountSum = tokenOutputArray.reduce(
      (pre, cur) => pre + cur.tokenAmount,
      0n
    );

    let changeTokenAmount = inputTokenAmountSum - outputTokenAmountSum;
    if (changeTokenAmount > 0) {
      tokenOutputArray.push({
        address: bsv.Address.fromPublicKey(senderPk, network),
        tokenAmount: changeTokenAmount,
      });
    }

    const defaultFtUtxo = ftUtxos[0];
    const ftUtxoTx = new bsv.Transaction(defaultFtUtxo.txHex);
    const tokenLockingScript =
      ftUtxoTx.outputs[defaultFtUtxo.outputIndex].script;
    let oracleDataObj = TokenProto.parseOracleData(
      tokenLockingScript.toBuffer()
    );

    //create routeCheck contract
    routeCheckContract = ft.createRouteCheckContract(
      routeCheckType,
      tokenOutputArray,
      TokenProto.newTokenID(
        oracleDataObj.tokenID.txid,
        oracleDataObj.tokenID.index
      ),
      TokenProto.getContractCodeHash(tokenLockingScript.toBuffer())
    );

    //create routeCheck tx
    let routeCheckTx = ft.createRouteCheckTx({
      utxos,
      utxoAddress,
      feeb,
      routeCheckContract,
    });

    return {
      raw: routeCheckTx.serialize(),
      outputs: this.getVinsOutputs(routeCheckTx),
      sigtype: sighashType,
    };
  }

  static async transfer({
    satotxPubKeys,

    senderPk,
    receivers,
    ftUtxos,
    routeCheckType,
    routeCheckHex,
    oracleSelecteds,

    utxos,
    utxoAddress,
    feeb,
    network = "mainnet",
  }) {
    utxoAddress = new bsv.Address(utxoAddress, network);
    senderPk = new bsv.PublicKey(senderPk);
    ftUtxos.forEach((v) => {
      v.tokenAmount = BigInt(v.tokenAmount);
      v.preTokenAmount = BigInt(v.preTokenAmount);
    });

    let ft = new FungibleToken(
      BigInt("0x" + satotxPubKeys[0]),
      BigInt("0x" + satotxPubKeys[1]),
      BigInt("0x" + satotxPubKeys[2])
    );

    let tokenOutputArray = receivers.map((v) => ({
      address: new bsv.Address(v.address, network),
      tokenAmount: BigInt(v.amount),
    }));

    let inputTokenAmountSum = ftUtxos.reduce(
      (pre, cur) => pre + cur.tokenAmount,
      0n
    );
    let outputTokenAmountSum = tokenOutputArray.reduce(
      (pre, cur) => pre + cur.tokenAmount,
      0n
    );

    let changeTokenAmount = inputTokenAmountSum - outputTokenAmountSum;
    if (changeTokenAmount > 0) {
      tokenOutputArray.push({
        address: bsv.Address.fromPublicKey(senderPk, network),
        tokenAmount: changeTokenAmount,
      });
    }

    const defaultFtUtxo = ftUtxos[0];
    const ftUtxoTx = new bsv.Transaction(defaultFtUtxo.txHex);
    const tokenLockingScript =
      ftUtxoTx.outputs[defaultFtUtxo.outputIndex].script;
    let oracleDataObj = TokenProto.parseOracleData(
      tokenLockingScript.toBuffer()
    );

    //create routeCheck contract
    let routeCheckContract = ft.createRouteCheckContract(
      routeCheckType,
      tokenOutputArray,
      TokenProto.newTokenID(
        oracleDataObj.tokenID.txid,
        oracleDataObj.tokenID.index
      ),
      TokenProto.getContractCodeHash(tokenLockingScript.toBuffer())
    );

    //create routeCheck tx
    let routeCheckTx = new bsv.Transaction(routeCheckHex);

    const tokenInputArray = ftUtxos.map((v) => ({
      lockingScript: v.lockingScript,
      satoshis: v.satoshis,
      txId: v.txId,
      outputIndex: v.outputIndex,
      preTokenAddress: new bsv.Address(v.preTokenAddress, network),
      preTokenAmount: v.preTokenAmount,
    }));

    const satoshiInputArray = utxos.map((v) => ({
      lockingScript: bsv.Script.buildPublicKeyHashOut(utxoAddress).toHex(),
      satoshis: v.satoshis,
      txId: v.txId,
      outputIndex: v.outputIndex,
    }));

    let checkRabinMsgArray = Buffer.alloc(0);
    let checkRabinPaddingArray = Buffer.alloc(0);
    let checkRabinSigArray = Buffer.alloc(0);

    for (let i = 0; i < ftUtxos.length; i++) {
      let v = ftUtxos[i];

      for (let j = 0; j < 2; j++) {
        const signerIndex = oracleSelecteds[j];
        let sigInfo = await ScriptHelper.signers[signerIndex].satoTxSigUTXO({
          txId: v.txId,
          index: v.outputIndex,
          txHex: v.txHex,
        });
        if (j == 0) {
          checkRabinMsgArray = Buffer.concat([
            checkRabinMsgArray,
            Buffer.from(sigInfo.payload, "hex"),
          ]);
        }

        const sigBuf = toBufferLE(sigInfo.sigBE, TokenUtil.RABIN_SIG_LEN);
        checkRabinSigArray = Buffer.concat([checkRabinSigArray, sigBuf]);
        const paddingCountBuf = Buffer.alloc(2, 0);
        paddingCountBuf.writeUInt16LE(sigInfo.padding.length / 2);
        const padding = Buffer.alloc(sigInfo.padding.length / 2, 0);
        padding.write(sigInfo.padding, "hex");
        checkRabinPaddingArray = Buffer.concat([
          checkRabinPaddingArray,
          paddingCountBuf,
          padding,
        ]);
      }
    }

    const tokenRabinDatas = [];
    for (let i = 0; i < ftUtxos.length; i++) {
      let v = ftUtxos[i];
      let tokenRabinMsg;
      let tokenRabinSigArray = [];
      let tokenRabinPaddingArray = [];
      for (let j = 0; j < 2; j++) {
        const signerIndex = oracleSelecteds[j];
        let sigInfo = await ScriptHelper.signers[
          signerIndex
        ].satoTxSigUTXOSpendBy({
          txId: v.preTxId,
          index: v.preOutputIndex,
          txHex: v.preTxHex,
          byTxId: v.txId,
          byTxHex: v.txHex,
        });
        tokenRabinMsg = sigInfo.payload;
        tokenRabinSigArray.push(BigInt("0x" + sigInfo.sigBE));
        tokenRabinPaddingArray.push(new Bytes(sigInfo.padding));
      }

      tokenRabinDatas.push({
        tokenRabinMsg,
        tokenRabinSigArray,
        tokenRabinPaddingArray,
      });
    }

    let rabinPubKeyIndexArray = oracleSelecteds;

    let tx = await ft.createTransferTx({
      routeCheckTx,
      tokenInputArray,
      satoshiInputArray,
      rabinPubKeyIndexArray,
      checkRabinMsgArray,
      checkRabinPaddingArray,
      checkRabinSigArray,
      tokenOutputArray,
      tokenRabinDatas,
      routeCheckContract,
      senderPk,
      utxoAddress,
      feeb,
    });
    return {
      raw: tx.serialize(),
      outputs: this.getVinsOutputs(tx),
      sigtype: sighashType,
    };
  }
}

module.exports = {
  TokenTxHelper,
};
