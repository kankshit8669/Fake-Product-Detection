$(function () {
    ChainConnection.submit(function () {
        var code = ChainConnection.field('ManufacturerCode');
        var wallet = ChainConnection.field('ManufacturerWallet');
        if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
            throw new Error('Enter a valid Ethereum wallet address.');
        }
        return ChainConnection.run('registerManufacturer', [ChainConnection.encode(code), wallet], true)
            .then(function () {
                ChainConnection.resetFields(['ManufacturerCode', 'ManufacturerWallet']);
                ChainConnection.showSuccess('Manufacturer wallet registered.');
            });
    });
});
