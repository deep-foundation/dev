const { expect } = require('chai');
const {resend} = require('../../resend.cjs');

exports.testResend = async ({terminalKey}) => {
    console.log('testResend-start');
    const resendOptions = {
      TerminalKey: terminalKey,
    };
    console.log({ resendOptions });

    const resendResult = await resend(resendOptions);
    console.log({ resendResult });

    expect(resendResult.error).to.equal(undefined);
    console.log('testResend-end');
  };