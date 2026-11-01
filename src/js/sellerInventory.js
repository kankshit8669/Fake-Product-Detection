$(function () {
    ChainConnection.submit(function () {
        return ChainConnection.run('queryProductsList', [
            ChainConnection.encode(ChainConnection.field('sellerCode'))
        ]).then(function (result) {
            ChainConnection.rows(ChainConnection.tableData(result, [0, 1, 2, 3, 4, 5], [1, 2, 3, 5]));
            ChainConnection.showSuccess('Product list loaded.');
        });
    });
});
