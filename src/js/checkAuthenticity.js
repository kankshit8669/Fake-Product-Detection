$(function () {
    ChainConnection.submit(function () {
        var serial = ChainConnection.encode(ChainConnection.field('productSN'));
        var code = ChainConnection.encode(ChainConnection.field('consumerCode'));
        return ChainConnection.run('isRegisteredProduct', [serial]).then(function (registered) {
            if (!registered) {
                ChainConnection.rows([['Serial number not found in registered products.']]);
                ChainConnection.showError(new Error('This product has no registration record.'));
                return;
            }
            return ChainConnection.run('verifyProduct', [serial, code], false, true).then(function (owned) {
                ChainConnection.rows([[owned ? 'Registered product; purchase belongs to this wallet.' : 'Serial is registered, but this wallet does not match the purchase.']]);
                if (owned) ChainConnection.showSuccess('Your purchase has been verified.');
                else ChainConnection.showError(new Error('Connect the buyer wallet and check the consumer code.'));
            });
        });
    });
});
