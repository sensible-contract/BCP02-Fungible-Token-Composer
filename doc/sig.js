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

module.exports = {
  genSignedTx,
};
