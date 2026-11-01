$(function () {
    ChainConnection.submit(function () {
        var serial = ChainConnection.encode(ChainConnection.field('productSN'));
        var buyerCode = ChainConnection.encode(ChainConnection.field('consumerCode'));
        return ChainConnection.run('confirmPurchase', [serial, buyerCode], true).then(function () {
            ChainConnection.showSuccess('Purchase confirmed. The product is now linked to your wallet.');
            ChainConnection.resetFields(['productSN', 'consumerCode']);
        });
    });
});
