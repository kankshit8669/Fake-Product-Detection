$(function () {
    ChainConnection.submit(function () {
        return ChainConnection.run('getWalletPurchaseHistory', [], false, true).then(function (result) {
            ChainConnection.rows(ChainConnection.tableData(result, [0, 1, 2], [0, 1, 2]));
            ChainConnection.showSuccess('Purchase history loaded for the connected wallet.');
        });
    });
});
