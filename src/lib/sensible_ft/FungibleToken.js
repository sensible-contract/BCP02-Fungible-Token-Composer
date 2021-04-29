// @ts-nocheck
const {
  bsv,
  buildContractClass,
  Bytes,
  getPreimage,
  num2bin,
  PubKey,
  Ripemd160,
  Sha256,
  Sig,
  SigHashPreimage,
  signTx,
  toHex,
} = require("scryptlib");

const { ScriptHelper } = require("./ScriptHelper");
const TokenProto = require("./tokenProto");
const TokenUtil = require("./tokenUtil");
const Signature = bsv.crypto.Signature;
const sighashType = Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID;
const genesisFlag = 1;
const nonGenesisFlag = 0;
const tokenType = 1;
const genesisTokenIDTxid =
  "0000000000000000000000000000000000000000000000000000000000000000";
const GenesisContractClass = buildContractClass(
  ScriptHelper.loadDesc("tokenGenesis_desc.json")
);
const TokenContractClass = buildContractClass(
  ScriptHelper.loadDesc("token_desc.json")
);

const RouteCheckContractClass_3To3 = buildContractClass(
  ScriptHelper.loadDesc("tokenRouteCheck_desc.json")
);

const RouteCheckContractClass_6To6 = buildContractClass(
  ScriptHelper.loadDesc("tokenRouteCheck_6To6_desc.json")
);

const RouteCheckContractClass_10To10 = buildContractClass(
  ScriptHelper.loadDesc("tokenRouteCheck_10To10_desc.json")
);

const RouteCheckContractClass_3To100 = buildContractClass(
  ScriptHelper.loadDesc("tokenRouteCheck_3To100_desc.json")
);

const RouteCheckContractClass_20To3 = buildContractClass(
  ScriptHelper.loadDesc("tokenRouteCheck_20To3_desc.json")
);

const UnlockContractCheckContractClass_1To5 = buildContractClass(
  ScriptHelper.loadDesc("tokenUnlockContractCheck_1To5_desc.json")
);

const UnlockContractCheckContractClass_4To8 = buildContractClass(
  ScriptHelper.loadDesc("tokenUnlockContractCheck_4To8_desc.json")
);

const UnlockContractCheckContractClass_8To12 = buildContractClass(
  ScriptHelper.loadDesc("tokenUnlockContractCheck_8To12_desc.json")
);

const UnlockContractCheckContractClass_20To5 = buildContractClass(
  ScriptHelper.loadDesc("tokenUnlockContractCheck_20To5_desc.json")
);

const UnlockContractCheckContractClass_3To100 = buildContractClass(
  ScriptHelper.loadDesc("tokenUnlockContractCheck_3To100_desc.json")
);

const ROUTE_CHECK_TYPE_3To3 = "3To3";
const ROUTE_CHECK_TYPE_6To6 = "6To6";
const ROUTE_CHECK_TYPE_10To10 = "10To10";
const ROUTE_CHECK_TYPE_3To100 = "3To100";
const ROUTE_CHECK_TYPE_20To3 = "20To3";

class FungibleToken {
  constructor(rabinPubKey1, rabinPubKey2, rabinPubKey3) {
    this.rabinPubKeyArray = [rabinPubKey1, rabinPubKey2, rabinPubKey3];

    this.routeCheckCodeHashArray = [
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new RouteCheckContractClass_3To3(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new RouteCheckContractClass_6To6(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new RouteCheckContractClass_10To10(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new RouteCheckContractClass_3To100(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new RouteCheckContractClass_20To3(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
    ];

    this.unlockContractCodeHashArray = [
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new UnlockContractCheckContractClass_1To5(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new UnlockContractCheckContractClass_4To8(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new UnlockContractCheckContractClass_8To12(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new UnlockContractCheckContractClass_20To5(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new UnlockContractCheckContractClass_3To100(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
    ];
  }

  /**
   * create genesis contract
   * @param {Object} issuerPubKey issuer public key used to unlocking genesis contract
   * @param {string} tokenName the token name
   * @param {string} tokenSymbol the token symbol
   * @param {number} decimalNum the token amount decimal number
   * @returns
   */
  createGenesisContract(
    issuerPubKey,
    { tokenName, tokenSymbol, decimalNum } = {}
  ) {
    const genesisContract = new GenesisContractClass(
      new PubKey(toHex(issuerPubKey)),
      this.rabinPubKeyArray
    );
    if (tokenName) {
      const dataPart = TokenProto.newDataPart({
        tokenName,
        tokenSymbol,
        genesisFlag,
        decimalNum,
        tokenType,
      });
      genesisContract.setDataPart(dataPart.toString("hex"));
    }

    return genesisContract;
  }

  /**
   * create a tx for genesis
   * @param {bsv.PrivateKey} privateKey the privatekey that utxos belong to
   * @param {Object[]} utxos utxos
   * @param {bsv.Address} changeAddress the change address
   * @param {number} feeb feeb
   * @param {string} genesisScript genesis contract's locking scriptsatoshis
   */
  createGenesisTx({ utxos, utxoAddress, feeb, genesisContract }) {
    const tx = new bsv.Transaction().from(
      utxos.map((utxo) => ({
        txId: utxo.txId,
        outputIndex: utxo.outputIndex,
        satoshis: utxo.satoshis,
        script: bsv.Script.buildPublicKeyHashOut(utxoAddress).toHex(),
      }))
    );
    tx.addOutput(
      new bsv.Transaction.Output({
        script: genesisContract.lockingScript,
        satoshis: ScriptHelper.getDustThreshold(
          genesisContract.lockingScript.toBuffer().length
        ),
      })
    );

    tx.change(utxoAddress);
    tx.fee(
      Math.ceil((tx.serialize(true).length / 2 + utxos.length * 107) * feeb)
    );
    return tx;
  }

  /**
   * create token contract from genesis contract utxo
   * @param {string} genesisTxId the genesis txid
   * @param {number} genesisTxOutputIndex the genesis utxo output index
   * @param {bsv.Script} genesisScript the genesis contract's locking script
   * @param {bsv.Address} receiverAddress receiver's address
   * @param {BigInt} tokenAmount the token amount want to create
   * @returns
   */
  createTokenContract(
    toSpentGenesisTxId,
    toSpentGenesisTxOutputIndex,
    genesisContract,
    { receiverAddress, tokenAmount } = {}
  ) {
    const scriptBuffer = genesisContract.lockingScript.toBuffer();
    const dataPartObj = TokenProto.parseDataPart(scriptBuffer);

    let genesisHash;
    if (dataPartObj.tokenID.txid == genesisTokenIDTxid) {
      dataPartObj.tokenID = {
        txid: toSpentGenesisTxId,
        index: toSpentGenesisTxOutputIndex,
      };
      const newScriptBuf = TokenProto.updateScript(scriptBuffer, dataPartObj);
      genesisHash = bsv.crypto.Hash.sha256ripemd160(newScriptBuf);
    } else {
      genesisHash = bsv.crypto.Hash.sha256ripemd160(scriptBuffer);
    }

    const tokenContract = new TokenContractClass(
      this.rabinPubKeyArray,
      this.routeCheckCodeHashArray,
      this.unlockContractCodeHashArray,
      new Bytes(toHex(genesisHash))
    );
    if (receiverAddress) {
      dataPartObj.genesisFlag = nonGenesisFlag;
      dataPartObj.tokenAddress = toHex(receiverAddress.hashBuffer);
      dataPartObj.tokenAmount = tokenAmount;
      const dataPart = TokenProto.newDataPart(dataPartObj);
      tokenContract.setDataPart(toHex(dataPart));
    }

    return tokenContract;
  }

  async createIssueTx({
    genesisContract,
    genesisTxId,
    genesisTxOutputIndex,
    genesisLockingScript,

    utxos,
    utxoAddress,
    feeb,
    tokenContract,
    allowIncreaseIssues,
    satotxData,
    signerSelecteds,
  }) {
    const tx = new bsv.Transaction();

    tx.addInput(
      new bsv.Transaction.Input({
        output: new bsv.Transaction.Output({
          script: genesisLockingScript,
          satoshis: ScriptHelper.getDustThreshold(
            genesisLockingScript.toBuffer().length
          ),
        }),
        prevTxId: genesisTxId,
        outputIndex: genesisTxOutputIndex,
        script: bsv.Script.empty(),
      })
    );

    utxos.forEach((utxo) => {
      tx.addInput(
        new bsv.Transaction.Input({
          output: new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(utxoAddress).toHex(),
            satoshis: utxo.satoshis,
          }),
          prevTxId: utxo.txId,
          outputIndex: utxo.outputIndex,
          script: bsv.Script.empty(),
        })
      );
    });

    const tokenDataPartObj = TokenProto.parseDataPart(
      tokenContract.lockingScript.toBuffer()
    );
    const genesisDataPartObj = TokenProto.parseDataPart(
      genesisContract.lockingScript.toBuffer()
    );

    const isFirstGenesis =
      genesisDataPartObj.tokenID.txid == genesisTokenIDTxid;

    let genesisContractSatoshis = 0;
    if (allowIncreaseIssues) {
      genesisDataPartObj.tokenID = tokenDataPartObj.tokenID;
      let newGenesislockingScript = bsv.Script.fromBuffer(
        TokenProto.updateScript(
          genesisLockingScript.toBuffer(),
          genesisDataPartObj
        )
      );
      genesisContractSatoshis = ScriptHelper.getDustThreshold(
        newGenesislockingScript.toBuffer().length
      );
      tx.addOutput(
        new bsv.Transaction.Output({
          script: newGenesislockingScript,
          satoshis: genesisContractSatoshis,
        })
      );
    }

    const tokenContractSatoshis = ScriptHelper.getDustThreshold(
      tokenContract.lockingScript.toBuffer().length
    );

    tx.addOutput(
      new bsv.Transaction.Output({
        script: tokenContract.lockingScript,
        satoshis: tokenContractSatoshis,
      })
    );
    tx.change(utxoAddress);

    const curInputIndex = 0;
    const curInputSatoshis = tx.inputs[curInputIndex].output.satoshis;

    let sigBuf = Buffer.alloc(71, 0);

    let rabinMsg;
    let rabinPaddingArray = [];
    let rabinSigArray = [];
    let rabinPubKeyIndexArray = [];
    if (isFirstGenesis) {
      rabinMsg = Buffer.alloc(1, 0);
      rabinPaddingArray = [new Bytes("00"), new Bytes("00")];
      rabinSigArray = [0, 0];
      rabinPubKeyIndexArray = [0, 1];
    } else {
      for (let i = 0; i < 2; i++) {
        const signerIndex = signerSelecteds[i];
        let sigInfo = await ScriptHelper.signers[
          signerIndex
        ].satoTxSigUTXOSpendBy(satotxData);
        rabinMsg = sigInfo.payload;
        rabinPaddingArray.push(new Bytes(sigInfo.padding));
        rabinSigArray.push(BigInt("0x" + sigInfo.sigBE));
      }

      rabinPubKeyIndexArray = signerSelecteds;
    }

    //let the fee to be exact in the second round
    for (let c = 0; c < 2; c++) {
      tx.fee(
        Math.ceil((tx.serialize(true).length / 2 + utxos.length * 107) * feeb)
      );
      let changeSatoshis = tx.outputs[tx.outputs.length - 1].satoshis;
      let preimage = getPreimage(
        tx,
        genesisLockingScript.toASM(),
        curInputSatoshis,
        curInputIndex,
        sighashType
      );
      let contractObj = genesisContract.unlock(
        new SigHashPreimage(toHex(preimage)),
        new Sig(sigBuf.toString("hex")),
        new Bytes(rabinMsg.toString("hex")),
        rabinPaddingArray,
        rabinSigArray,
        rabinPubKeyIndexArray,
        genesisContractSatoshis,
        new Bytes(tokenContract.lockingScript.toHex()),
        tokenContractSatoshis,
        new Ripemd160(toHex(utxoAddress.hashBuffer)),
        changeSatoshis
      );
      tx.inputs[0].setScript(contractObj.toScript());
    }

    return tx;
  }

  createRouteCheckContract(
    routeCheckType,
    tokenInputArray,
    tokenOutputArray,
    tokenID,
    tokenCodeHash
  ) {
    let recervierArray = Buffer.alloc(0, 0);
    let receiverTokenAmountArray = Buffer.alloc(0, 0);
    for (let i = 0; i < tokenOutputArray.length; i++) {
      const item = tokenOutputArray[i];
      recervierArray = Buffer.concat([recervierArray, item.address.hashBuffer]);
      const amountBuf = TokenUtil.getUInt64Buf(item.tokenAmount);
      receiverTokenAmountArray = Buffer.concat([
        receiverTokenAmountArray,
        amountBuf,
      ]);
    }
    let routeCheckContract;
    if (routeCheckType == ROUTE_CHECK_TYPE_3To3) {
      routeCheckContract = new RouteCheckContractClass_3To3(
        this.rabinPubKeyArray
      );
    } else if (routeCheckType == ROUTE_CHECK_TYPE_6To6) {
      routeCheckContract = new RouteCheckContractClass_6To6(
        this.rabinPubKeyArray
      );
    } else if (routeCheckType == ROUTE_CHECK_TYPE_10To10) {
      routeCheckContract = new RouteCheckContractClass_10To10(
        this.rabinPubKeyArray
      );
    } else if (routeCheckType == ROUTE_CHECK_TYPE_3To100) {
      routeCheckContract = new RouteCheckContractClass_3To100(
        this.rabinPubKeyArray
      );
    } else if (routeCheckType == ROUTE_CHECK_TYPE_20To3) {
      routeCheckContract = new RouteCheckContractClass_20To3(
        this.rabinPubKeyArray
      );
    }

    const data = Buffer.concat([
      TokenUtil.getUInt32Buf(tokenInputArray.length),
      receiverTokenAmountArray,
      recervierArray,
      TokenUtil.getUInt32Buf(tokenOutputArray.length),
      tokenCodeHash,
      tokenID,
    ]);
    routeCheckContract.setDataPart(toHex(data));
    return routeCheckContract;
  }

  createRouteCheckTx({ utxos, utxoAddress, feeb, routeCheckContract }) {
    const tx = new bsv.Transaction().from(
      utxos.map((utxo) => ({
        txId: utxo.txId,
        outputIndex: utxo.outputIndex,
        satoshis: utxo.satoshis,
        script: bsv.Script.buildPublicKeyHashOut(utxoAddress).toHex(),
      }))
    );

    tx.addOutput(
      new bsv.Transaction.Output({
        script: routeCheckContract.lockingScript,
        satoshis: ScriptHelper.getDustThreshold(
          routeCheckContract.lockingScript.toBuffer().length
        ),
      })
    );

    tx.change(utxoAddress);
    tx.fee(
      Math.ceil((tx.serialize(true).length / 2 + utxos.length * 107) * feeb)
    );
    return tx;
  }

  createTransferTx({
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
  }) {
    const tx = new bsv.Transaction();
    let prevouts = Buffer.alloc(0);
    const tokenInputLen = tokenInputArray.length;
    let inputTokenScript;
    let inputTokenAmountArray = Buffer.alloc(0);
    let inputTokenAddressArray = Buffer.alloc(0);
    for (let i = 0; i < tokenInputLen; i++) {
      const tokenInput = tokenInputArray[i];
      const tokenScript = bsv.Script.fromBuffer(
        Buffer.from(tokenInput.lockingScript, "hex")
      );
      inputTokenScript = tokenScript;
      const tokenScriptBuf = tokenScript.toBuffer();
      const inputSatoshis = tokenInput.satoshis;
      const txId = tokenInput.txId;
      const outputIndex = tokenInput.outputIndex;
      // token contract input
      tx.addInput(
        new bsv.Transaction.Input({
          output: new bsv.Transaction.Output({
            script: tokenScript,
            satoshis: inputSatoshis,
          }),
          prevTxId: txId,
          outputIndex: outputIndex,
          script: bsv.Script.empty(),
        })
      );

      inputTokenAddressArray = Buffer.concat([
        inputTokenAddressArray,
        TokenProto.getTokenAddress(tokenScriptBuf),
      ]);
      const amountBuf = Buffer.alloc(8, 0);
      amountBuf.writeBigUInt64LE(
        BigInt(TokenProto.getTokenAmount(tokenScriptBuf))
      );
      inputTokenAmountArray = Buffer.concat([inputTokenAmountArray, amountBuf]);

      // add outputpoint to prevouts
      const indexBuf = TokenUtil.getUInt32Buf(outputIndex);
      const txidBuf = TokenUtil.getTxIdBuf(txId);

      prevouts = Buffer.concat([prevouts, txidBuf, indexBuf]);
    }

    for (let i = 0; i < satoshiInputArray.length; i++) {
      const satoshiInput = satoshiInputArray[i];
      const lockingScript = bsv.Script.fromBuffer(
        Buffer.from(satoshiInput.lockingScript, "hex")
      );
      const inputSatoshis = satoshiInput.satoshis;
      const txId = satoshiInput.txId;
      const outputIndex = satoshiInput.outputIndex;
      // bsv input to provide fee
      tx.addInput(
        new bsv.Transaction.Input.PublicKeyHash({
          output: new bsv.Transaction.Output({
            script: lockingScript,
            satoshis: inputSatoshis,
          }),
          prevTxId: txId,
          outputIndex: outputIndex,
          script: bsv.Script.empty(),
        })
      );

      // add outputpoint to prevouts
      const indexBuf = Buffer.alloc(4, 0);
      indexBuf.writeUInt32LE(outputIndex);
      const txidBuf = Buffer.from([...Buffer.from(txId, "hex")].reverse());
      prevouts = Buffer.concat([prevouts, txidBuf, indexBuf]);
    }

    // add routeCheckTx
    tx.addInput(
      new bsv.Transaction.Input({
        output: new bsv.Transaction.Output({
          script: routeCheckTx.outputs[0].script,
          satoshis: routeCheckTx.outputs[0].satoshis,
        }),
        prevTxId: routeCheckTx.id,
        outputIndex: 0,
        script: bsv.Script.empty(),
      })
    );
    let indexBuf = Buffer.alloc(4, 0);
    prevouts = Buffer.concat([
      prevouts,
      Buffer.from(routeCheckTx.id, "hex").reverse(),
      indexBuf,
    ]);

    let recervierArray = Buffer.alloc(0);
    let receiverTokenAmountArray = Buffer.alloc(0);
    let outputSatoshiArray = Buffer.alloc(0);
    const tokenOutputLen = tokenOutputArray.length;
    for (let i = 0; i < tokenOutputLen; i++) {
      const tokenOutput = tokenOutputArray[i];
      const address = tokenOutput.address;
      const outputTokenAmount = tokenOutput.tokenAmount;

      const lockingScriptBuf = TokenProto.getNewTokenScript(
        inputTokenScript.toBuffer(),
        address.hashBuffer,
        outputTokenAmount
      );
      const outputSatoshis = ScriptHelper.getDustThreshold(
        lockingScriptBuf.length
      );
      tx.addOutput(
        new bsv.Transaction.Output({
          script: bsv.Script.fromBuffer(lockingScriptBuf),
          satoshis: outputSatoshis,
        })
      );
      recervierArray = Buffer.concat([recervierArray, address.hashBuffer]);
      const tokenBuf = Buffer.alloc(8, 0);
      tokenBuf.writeBigUInt64LE(BigInt(outputTokenAmount));
      receiverTokenAmountArray = Buffer.concat([
        receiverTokenAmountArray,
        tokenBuf,
      ]);
      const satoshiBuf = Buffer.alloc(8, 0);
      satoshiBuf.writeBigUInt64LE(BigInt(outputSatoshis));
      outputSatoshiArray = Buffer.concat([outputSatoshiArray, satoshiBuf]);
    }

    tx.change(utxoAddress);

    //let the fee to be exact in the second round
    for (let c = 0; c < 2; c++) {
      tx.fee(
        Math.ceil(
          (tx.serialize(true).length / 2 + satoshiInputArray.length * 107) *
            feeb
        )
      );
      let changeSatoshis = tx.outputs[tx.outputs.length - 1].satoshis;
      const routeCheckInputIndex = tokenInputLen + satoshiInputArray.length;
      for (let i = 0; i < tokenInputLen; i++) {
        const tokenInput = tokenInputArray[i];
        const tokenScript = bsv.Script.fromBuffer(
          Buffer.from(tokenInput.lockingScript, "hex")
        );
        const satoshis = tokenInput.satoshis;
        const inIndex = i;
        const preimage = getPreimage(
          tx,
          tokenScript.toASM(),
          satoshis,
          inIndex,
          sighashType
        );

        let sig = Buffer.alloc(71, 0);

        let tokenRanbinData = tokenRabinDatas[i];

        const tokenContract = new TokenContractClass(
          this.rabinPubKeyArray,
          this.routeCheckCodeHashArray,
          this.unlockContractCodeHashArray,
          new Bytes(
            toHex(bsv.crypto.Hash.sha256ripemd160(tokenScript.toBuffer()))
          )
        );

        const unlockingContract = tokenContract.unlock(
          new SigHashPreimage(toHex(preimage)),
          inIndex,
          new Bytes(toHex(prevouts)),
          new Bytes(toHex(tokenRanbinData.tokenRabinMsg)),
          tokenRanbinData.tokenRabinPaddingArray,
          tokenRanbinData.tokenRabinSigArray,
          rabinPubKeyIndexArray,
          routeCheckInputIndex,
          new Bytes(routeCheckTx.serialize(true)),
          0,
          tokenOutputLen,
          new Bytes(toHex(tokenInput.preTokenAddress.hashBuffer)),
          tokenInput.preTokenAmount,
          new PubKey(toHex(senderPk)),
          new Sig(toHex(sig)),
          0,
          new Bytes("00"),
          0,
          1
        );
        // let ret = unlockingContract.verify();
        // if (ret.success == false) throw ret;
        // throw "success";
        tx.inputs[inIndex].setScript(unlockingContract.toScript());
      }

      let preimage = getPreimage(
        tx,
        routeCheckTx.outputs[0].script.toASM(),
        routeCheckTx.outputs[0].satoshis,
        routeCheckInputIndex,
        sighashType
      );

      let unlockingContract = routeCheckContract.unlock(
        new SigHashPreimage(toHex(preimage)),
        new Bytes(tokenInputArray[0].lockingScript),
        new Bytes(toHex(prevouts)),
        new Bytes(toHex(checkRabinMsgArray)),
        new Bytes(toHex(checkRabinPaddingArray)),
        new Bytes(toHex(checkRabinSigArray)),
        rabinPubKeyIndexArray,
        new Bytes(toHex(inputTokenAddressArray)),
        new Bytes(toHex(inputTokenAmountArray)),
        new Bytes(toHex(outputSatoshiArray)),
        changeSatoshis,
        new Ripemd160(toHex(utxoAddress.hashBuffer))
      );
      tx.inputs[routeCheckInputIndex].setScript(unlockingContract.toScript());
    }

    return tx;
  }
}

module.exports = {
  FungibleToken,
  sighashType,
  ROUTE_CHECK_TYPE_3To3,
  ROUTE_CHECK_TYPE_6To6,
  ROUTE_CHECK_TYPE_10To10,
  ROUTE_CHECK_TYPE_3To100,
  ROUTE_CHECK_TYPE_20To3,
};
