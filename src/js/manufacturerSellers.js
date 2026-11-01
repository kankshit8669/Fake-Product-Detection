$(function () {
    ChainConnection.submit(function () {
        return ChainConnection.run('querySellersList', [
            ChainConnection.encode(ChainConnection.field('manufacturerCode'))
        ]).then(function (result) {
            ChainConnection.rows(ChainConnection.tableData(result, [0, 1, 2, 3, 4, 5, 6], [1, 2, 3, 5, 6]));
            ChainConnection.showSuccess('Seller list loaded.');
        });
    });
});
