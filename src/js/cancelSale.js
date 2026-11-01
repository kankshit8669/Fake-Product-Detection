$(function () {
    ChainConnection.submit(function () {
        var serial = ChainConnection.encode(ChainConnection.field('productSN'));
        return ChainConnection.run('cancelSaleRequest', [serial], true).then(function () {
            ChainConnection.showSuccess('The pending request has been cancelled.');
            ChainConnection.resetFields(['productSN']);
        });
    });
});
