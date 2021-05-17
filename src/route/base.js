const { app } = require("../app");
const { NetMgr } = require("../domain/NetMgr");
const { TokenTxHelper } = require("../lib/sensible_ft/TokenTxHelper");
exports.default = function () {
  NetMgr.listen("POST", "/genesis", async function (req, res, params, body) {
    const signers = app.get("signerConfig");
    const {
      issuerPk,
      tokenName,
      tokenSymbol,
      decimalNum,

      utxos,
      changeAddress,
      feeb,
      network,
    } = body;
    return await TokenTxHelper.genesis({
      satotxPubKeys: signers.map((v) => v.satotxPubKey),

      issuerPk,
      tokenName,
      tokenSymbol,
      decimalNum,

      utxos,
      changeAddress,
      feeb,
      network,
    });
  });

  NetMgr.listen("POST", "/issue", async function (req, res, params, body) {
    const signers = app.get("signerConfig");
    let {
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
      signerSelecteds,

      utxos,
      changeAddress,
      feeb,
      network,
    } = body;
    signerSelecteds = signerSelecteds || body.oracleSelecteds;
    return await TokenTxHelper.issue({
      satotxPubKeys: signers.map((v) => v.satotxPubKey),

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
      signerSelecteds,

      utxos,
      changeAddress,
      feeb,
      network,
    });
  });

  NetMgr.listen("POST", "/routeCheck", async function (req, res, params, body) {
    const signers = app.get("signerConfig");
    const {
      senderPk,
      receivers,
      ftUtxos,
      routeCheckType,

      utxos,
      changeAddress,
      feeb,
      network,
    } = body;
    return await TokenTxHelper.routeCheck({
      satotxPubKeys: signers.map((v) => v.satotxPubKey),

      senderPk,
      receivers,
      ftUtxos,
      routeCheckType,

      utxos,
      changeAddress,
      feeb,
      network,
    });
  });

  NetMgr.listen("POST", "/transfer", async function (req, res, params, body) {
    const signers = app.get("signerConfig");
    let {
      senderPk,
      receivers,
      ftUtxos,
      routeCheckType,
      routeCheckHex,
      signerSelecteds,

      utxos,
      changeAddress,
      feeb,
      network,
    } = body;
    signerSelecteds = signerSelecteds || body.oracleSelecteds;
    return await TokenTxHelper.transfer({
      satotxPubKeys: signers.map((v) => v.satotxPubKey),

      senderPk,
      ftUtxos,
      receivers,
      routeCheckHex,
      routeCheckType,
      signerSelecteds,

      utxos,
      changeAddress,
      feeb,
      network,
    });
  });
};
