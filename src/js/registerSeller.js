$(function () {
    ChainConnection.submit(function () {
        var ids = ['ManufacturerId', 'SellerName', 'SellerBrand', 'SellerCode', 'SellerPhoneNumber', 'SellerManager', 'SellerAddress', 'SellerWallet'];
        var data = ids.map(ChainConnection.field);
        if (!/^\d+$/.test(data[4])) throw new Error('Enter a valid seller phone number.');
        if (!/^0x[a-fA-F0-9]{40}$/.test(data[7])) throw new Error('Enter a valid Ethereum wallet address.');
        return ChainConnection.run('addSeller', [
            ChainConnection.encode(data[0]), ChainConnection.encode(data[1]),
            ChainConnection.encode(data[2]), ChainConnection.encode(data[3]),
            data[4], ChainConnection.encode(data[5]), ChainConnection.encode(data[6]), data[7]
        ], true).then(function () {
            ChainConnection.resetFields(ids);
            ChainConnection.showSuccess('Seller registered successfully.');
        });
    });
});
