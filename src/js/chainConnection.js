/* Connection shared by the product, seller and consumer pages. */
var ChainConnection = (function () {
    var provider;
    var instance;
    var web3Client;

    function connect() {
        if (instance) return Promise.resolve(instance);

        if (window.ethereum) {
            provider = window.ethereum;
        } else if (window.web3 && window.web3.currentProvider) {
            provider = window.web3.currentProvider;
        } else {
            provider = new Web3.providers.HttpProvider('http://localhost:7545');
        }

        web3Client = new Web3(provider);
        return new Promise(function (resolve, reject) {
            $.getJSON('product.json').done(function (artifact) {
                var contract = TruffleContract(artifact);
                contract.setProvider(provider);
                contract.deployed().then(function (deployed) {
                    web3Client.version.getNetwork(function (networkError, networkId) {
                        if (networkError) return reject(networkError);
                        if (!artifact.networks || !artifact.networks[String(networkId)]) {
                            return reject(new Error('The contract is not deployed on the selected network. Check Ganache and MetaMask.'));
                        }
                        instance = deployed;
                        resolve(deployed);
                    });
                }).catch(reject);
            }).fail(function () {
                reject(new Error('Could not load the deployed contract. Compile and migrate it first.'));
            });
        });
    }

    function currentAccount() {
        if (window.ethereum && window.ethereum.request) {
            return window.ethereum.request({ method: 'eth_requestAccounts' }).then(function (accounts) {
                if (!accounts.length) throw new Error('No wallet account is available.');
                return accounts[0];
            });
        }
        return new Promise(function (resolve, reject) {
            web3Client.eth.getAccounts(function (error, accounts) {
                if (error) return reject(error);
                if (!accounts || !accounts.length) return reject(new Error('Unlock a wallet in Ganache or MetaMask.'));
                resolve(accounts[0]);
            });
        });
    }

    function encode(value) {
        var clean = String(value == null ? '' : value).trim();
        if (!clean) throw new Error('Fill in all required fields.');
        // Solidity fields in this project are bytes32.
        if (new TextEncoder().encode(clean).length > 32) {
            throw new Error('Text fields must not exceed 32 bytes.');
        }
        return web3Client.fromAscii ? web3Client.fromAscii(clean) : web3Client.utils.fromAscii(clean);
    }

    function decode(value) {
        var result = web3Client.toAscii ? web3Client.toAscii(value) : web3Client.utils.toAscii(value);
        return result.replace(/\0/g, '').trim();
    }

    function field(id) {
        var element = document.getElementById(id);
        return element ? element.value.trim() : '';
    }

    function run(method, args, isTransaction, useWallet) {
        return connect().then(function (contract) {
            if (!isTransaction) {
                if (!useWallet) return contract[method].apply(contract, args);
                return currentAccount().then(function (account) {
                    return contract[method].call.apply(contract[method], args.concat([{ from: account }]));
                });
            }
            return currentAccount().then(function (account) {
                return Promise.resolve(contract[method].apply(contract, args.concat([{ from: account }]))).then(function (result) {
                    if (result && result.receipt && (result.receipt.status === false || result.receipt.status === 0 || result.receipt.status === "0x0")) {
                        throw new Error('Transaction failed. Please check Ganache.');
                    }
                    if (document.getElementById('add')) document.getElementById('add').textContent = account;
                    return result;
                });
            });
        });
    }

    function showError(error) {
        var message = (error && error.message) || 'An unexpected error occurred.';
        if (/user denied|user rejected|4001/i.test(message)) message = 'You cancelled the wallet request.';
        if (/could not detect network|network changed|chain changed/i.test(message)) message = 'Check the selected network in MetaMask and try again.';
        if (/revert|reason string/i.test(message)) {
            var match = message.match(/(?:revert |reason string ['"])([^'"\n]+)/i);
            if (match) message = match[1];
        }
        var box = document.getElementById('statusMessage');
        if (box) {
            box.className = 'alert alert-danger status-message';
            box.textContent = message;
        } else {
            window.alert(message);
        }
        console.error(error);
    }

    function showSuccess(message) {
        var box = document.getElementById('statusMessage');
        if (box) {
            box.className = 'alert alert-success status-message';
            box.textContent = message;
        }
    }

    function submit(buttonHandler) {
        $(document).on('click', '.btn-register', function (event) {
            event.preventDefault();
            var button = $(this);
            if (button.prop('disabled')) return;
            button.prop('disabled', true);
            Promise.resolve().then(buttonHandler).catch(showError).then(function () {
                button.prop('disabled', false);
            });
        });
    }

    function rows(columns) {
        var table = document.getElementById('logdata');
        if (!table) return;
        table.textContent = '';
        columns.forEach(function (values) {
            var row = document.createElement('tr');
            values.forEach(function (value) {
                var cell = document.createElement('td');
                cell.textContent = String(value);
                row.appendChild(cell);
            });
            table.appendChild(row);
        });
    }

    function resetFields(ids) {
        ids.forEach(function (id) {
            var input = document.getElementById(id);
            if (input) input.value = '';
        });
    }

    // The contract query methods return separate arrays for each column.
    function tableData(result, indexes, encodedIndexes, skipEmptyAt) {
        var table = [];
        for (var i = 0; i < result[0].length; i++) {
            if (skipEmptyAt != null && Number(result[skipEmptyAt][i]) === 0) continue;
            var row = indexes.map(function (index) {
                var raw = result[index][i];
                return encodedIndexes.indexOf(index) >= 0 ? decode(raw) : raw.toString();
            });
            if (row.every(function (value) { return !value || value === '0'; })) continue;
            table.push(row);
        }
        return table;
    }

    return {
        connect: connect, encode: encode, decode: decode, field: field,
        run: run, submit: submit, rows: rows, tableData: tableData,
        resetFields: resetFields, showSuccess: showSuccess, showError: showError
    };
})();

if (window.ethereum && window.ethereum.on) {
    window.ethereum.on('accountsChanged', function () { window.location.reload(); });
    window.ethereum.on('chainChanged', function () { window.location.reload(); });
}
