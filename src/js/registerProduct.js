$(function () {
    ChainConnection.submit(function () {
        var ids = ['manufacturerID', 'productName', 'productSN', 'productBrand', 'productPrice'];
        var data = ids.map(ChainConnection.field);
        if (!/^\d+$/.test(data[4])) throw new Error('Enter a valid product price.');
        return ChainConnection.run('addProduct', [
            ChainConnection.encode(data[0]), ChainConnection.encode(data[1]),
            ChainConnection.encode(data[2]), ChainConnection.encode(data[3]), data[4]
        ], true).then(function () {
            ChainConnection.resetFields(ids);
            ChainConnection.showSuccess('Product added to the blockchain.');
        });
    });
});
