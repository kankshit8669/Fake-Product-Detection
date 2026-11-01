$(function () {
    ChainConnection.submit(function () {
        return ChainConnection.run('manufacturerSellProduct', [
            ChainConnection.encode(ChainConnection.field('productSN')),
            ChainConnection.encode(ChainConnection.field('sellerCode'))
        ], true).then(function () {
            ChainConnection.resetFields(['productSN', 'sellerCode']);
            ChainConnection.showSuccess('Product assigned to the seller.');
        });
    });
});
