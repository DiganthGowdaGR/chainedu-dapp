const CONTRACT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const CONTRACT_ABI = [
    "function uploadDocument(string _title, string _subject, string _description, string _cid, string _fileHash) returns (uint256)",
    "function updateDocument(uint256 _docId, string _cid, string _fileHash)",
    "function verifyDocument(uint256 _docId, uint256 _version, string _fileHash) view returns (bool)",
    "function getAllDocuments() view returns (tuple(uint256 docId, address uploader, string title, string subject, string description, uint256 versionCount)[])",
    "function getDocumentVersions(uint256 _docId) view returns (tuple(string cid, string fileHash, uint256 timestamp)[])",
    "event DocumentUploaded(uint256 indexed docId, address indexed uploader, string title)",
    "event DocumentUpdated(uint256 indexed docId, uint256 newVersionIndex, string cid)"
];

const App = {
    provider: null,
    signer: null,
    contract: null,
    userAddress: null,

    init() {
        this.setupNavigation();
        this.setupFileInputs();
        
        document.getElementById('connectWalletBtn').addEventListener('click', () => this.connectWallet());
        
        // Auto-check if previously connected
        if (typeof window.ethereum !== 'undefined') {
            window.ethereum.on('accountsChanged', (accounts) => {
                if(accounts.length > 0) {
                    this.connectWallet();
                } else {
                    this.userAddress = null;
                    document.getElementById('connectWalletBtn').innerText = "Connect Wallet";
                }
            });
        }
    },

    setupNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');
        const sections = document.querySelectorAll('.page-section');

        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                navBtns.forEach(b => b.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));

                btn.classList.add('active');
                const target = document.getElementById(btn.dataset.target);
                if (target) {
                    target.classList.add('active');
                }

                if(btn.dataset.target === 'browse-section' && this.contract) {
                    this.loadDocuments();
                }
            });
        });
    },

    setupFileInputs() {
        const setups = [
            { id: 'upFile', nameId: 'uploadFileName', dropId: 'uploadDropZone' },
            { id: 'vFile', nameId: 'verifyFileName', dropId: 'verifyDropZone' }
        ];

        setups.forEach(s => {
            const input = document.getElementById(s.id);
            const nameDisp = document.getElementById(s.nameId);
            const drop = document.getElementById(s.dropId);

            input.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    nameDisp.innerText = `Selected: ${e.target.files[0].name}`;
                    drop.style.borderColor = "var(--success)";
                }
            });

            // Drag and Drop styling
            drop.addEventListener('dragover', () => drop.classList.add('dragover'));
            drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
            drop.addEventListener('drop', () => drop.classList.remove('dragover'));
        });
    },

    async connectWallet() {
        if (typeof window.ethereum === 'undefined') {
            this.showToast("MetaMask is not installed!", "error");
            return;
        }

        try {
            this.provider = new ethers.BrowserProvider(window.ethereum);
            
            // Force MetaMask to switch to Hardhat Local Network automatically
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x7A69' }], // Hex for 31337
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0x7A69',
                            chainName: 'Hardhat Local',
                            rpcUrls: ['http://127.0.0.1:8545'],
                            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
                        }]
                    });
                }
            }

            const accounts = await this.provider.send("eth_requestAccounts", []);
            this.signer = await this.provider.getSigner();
            this.userAddress = await this.signer.getAddress();
            
            this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.signer);
            
            const btn = document.getElementById('connectWalletBtn');
            btn.innerText = `${this.userAddress.substring(0, 6)}...${this.userAddress.substring(38)}`;
            btn.style.background = "var(--success)";

            this.showToast("Wallet Connected!");
            this.loadDocuments();
            
        } catch (error) {
            console.error(error);
            this.showToast("Failed to connect wallet", "error");
        }
    },

    // --- Core Logic ---

    async computeFileHash(file) {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return `0x${hashHex}`;
    },

    async mockIPFSUpload(file) {
        // Simulating IPFS upload delay
        await new Promise(r => setTimeout(r, 1500));
        // Fake CID generator based on file name & time
        const rand = Math.random().toString(36).substring(2, 10);
        return `Qm${btoa(file.name).substring(0, 10)}${rand}FakeCID`;
    },

    async handleUpload(e) {
        e.preventDefault();
        if (!this.contract) return this.showToast("Please connect wallet first", "error");

        const btnText = document.querySelector('#uploadBtn .btn-text');
        const loader = document.querySelector('#uploadBtn .loader');

        try {
            btnText.innerText = "Processing...";
            
            const title = document.getElementById('upTitle').value;
            const subject = document.getElementById('upSubject').value;
            const desc = document.getElementById('upDesc').value;
            const file = document.getElementById('upFile').files[0];

            if(!file) throw new Error("No file selected");

            btnText.innerText = "Hashing locally...";
            const fileHash = await this.computeFileHash(file);

            btnText.innerText = "Uploading to IPFS...";
            const cid = await this.mockIPFSUpload(file);

            btnText.innerText = "Confirm Transaction in Wallet...";
            const tx = await this.contract.uploadDocument(title, subject, desc, cid, fileHash);
            
            btnText.innerText = "Awaiting Confirmation...";
            await tx.wait();

            this.showToast("Document Uploaded Successfully!");
            document.getElementById('uploadForm').reset();
            document.getElementById('uploadFileName').innerText = "";
            document.getElementById('uploadDropZone').style.borderColor = "";

        } catch (error) {
            console.error(error);
            this.showToast(error.shortMessage || error.message || "Upload failed", "error");
        } finally {
            btnText.innerText = "Publish Document";
        }
    },

    async handleVerify(e) {
        e.preventDefault();
        if (!this.contract) return this.showToast("Please connect wallet first", "error");

        const btnText = document.querySelector('#verifyBtn .btn-text');
        const resDiv = document.getElementById('verifyResult');
        
        try {
            btnText.innerText = "Hashing...";
            resDiv.classList.add('hidden');

            const docId = document.getElementById('vDocId').value;
            const version = document.getElementById('vVersion').value;
            const file = document.getElementById('vFile').files[0];

            if(!file) throw new Error("No file selected");

            const fileHash = await this.computeFileHash(file);
            
            btnText.innerText = "Querying Blockchain...";
            const isValid = await this.contract.verifyDocument(docId, version, fileHash);
            
            resDiv.classList.remove('hidden');
            if(isValid) {
                resDiv.className = "verification-result success";
                resDiv.innerHTML = `✅ <strong>Authentic Document</strong><br/>The file matches the on-chain hash for Document #${docId} (v${version})`;
            } else {
                resDiv.className = "verification-result fail";
                resDiv.innerHTML = `❌ <strong>Tampered or Incorrect File</strong><br/>The hash does not match the blockchain record.`;
            }

        } catch (error) {
            console.error(error);
            this.showToast("Verification failed. Check Doc ID and Version.", "error");
        } finally {
            btnText.innerText = "Verify Match";
        }
    },

    async loadDocuments() {
        if (!this.contract) return;
        
        const grid = document.getElementById('documents-grid');
        grid.innerHTML = '<div class="empty-state">Loading documents...</div>';

        try {
            const docs = await this.contract.getAllDocuments();
            const filter = document.getElementById('subjectFilter').value.toLowerCase();
            
            let html = '';
            let count = 0;

            for (let doc of docs) {
                // Return tuple mapping in ethers v6 gives access via indices or name if mapped
                let title = doc.title;
                let subject = doc.subject;
                let desc = doc.description;
                let id = doc.docId.toString();
                let vCount = doc.versionCount.toString();
                let uploader = doc.uploader;

                if (filter && !subject.toLowerCase().includes(filter)) continue;
                
                count++;
                html += `
                    <div class="doc-card" onclick="app.viewDocumentDetails(${id})">
                        <div class="doc-subject">${subject}</div>
                        <h3 class="doc-title">${title}</h3>
                        <p class="doc-desc">${desc.substring(0, 80)}${desc.length > 80 ? '...' : ''}</p>
                        <div class="doc-meta">
                            <span>ID: #${id}</span>
                            <span>Versions: ${vCount}</span>
                        </div>
                    </div>
                `;
            }

            if(count === 0) {
                grid.innerHTML = `<div class="empty-state">No documents found.</div>`;
            } else {
                grid.innerHTML = html;
            }

        } catch (error) {
            console.error("Error loading documents", error);
            grid.innerHTML = `<div class="empty-state">Failed to load from blockchain.</div>`;
        }
    },

    async viewDocumentDetails(docId) {
        if (!this.contract) return;
        const modalBody = document.getElementById('modalBody');
        
        try {
            document.getElementById('docModal').classList.add('active');
            modalBody.innerHTML = '<div class="empty-state">Fetching Chain Data...</div>';

            // We refetch all docs to find ours, or we could have cached it
            const docs = await this.contract.getAllDocuments();
            const doc = docs.find(d => d.docId.toString() === docId.toString());
            
            if(!doc) throw new Error("Document not found");

            const versions = await this.contract.getDocumentVersions(docId);
            
            let vHistoryHtml = '';
            for(let i=0; i<versions.length; i++) {
                const v = versions[i];
                const date = new Date(Number(v.timestamp) * 1000).toLocaleString();
                vHistoryHtml += `
                    <div class="version-item">
                        <h4>Version ${i + 1} &nbsp;<span style="font-size: 0.7em; color: var(--text-secondary);">${date}</span></h4>
                        <p><strong>IPFS CID:</strong> <a href="#" style="color:var(--accent-primary)">${v.cid}</a></p>
                        <p><strong>Hash:</strong> ${v.fileHash.substring(0, 15)}...${v.fileHash.substring(v.fileHash.length-10)}</p>
                    </div>
                `;
            }

            const isUploader = this.userAddress.toLowerCase() === doc.uploader.toLowerCase();

            modalBody.innerHTML = `
                <div style="margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--glass-border);">
                    <div class="doc-subject">${doc.subject}</div>
                    <h2>${doc.title}</h2>
                    <p style="color: var(--text-secondary); margin-top: 1rem;">${doc.description}</p>
                    <div style="margin-top: 1rem; font-size: 0.8rem; padding: 0.5rem; background: rgba(0,0,0,0.3); border-radius:4px;">
                        <strong>Uploader:</strong> ${doc.uploader}
                    </div>
                </div>

                <h3>Version History</h3>
                <div class="version-history">
                    ${vHistoryHtml}
                </div>

                ${isUploader ? `
                    <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--glass-border);">
                        <h3>Upload New Version</h3>
                        <form id="updateForm" style="margin-top: 1rem;" onsubmit="app.handleUpdate(event, ${docId})">
                            <div class="form-group file-upload-wrapper">
                                <div class="drop-zone" id="updateDropZone" style="padding: 1rem;">
                                    <input type="file" id="uFile" required>
                                    <div class="drop-zone-text" style="font-size: 0.8rem;">
                                        <span class="primary-text">Browse new file</span>
                                    </div>
                                    <div id="updateFileName" class="file-name" style="margin-top:0.5rem;"></div>
                                </div>
                            </div>
                            <button type="submit" class="submit-btn" id="updateBtn" style="padding: 0.6rem;">
                                <span class="btn-text">Publish Rev ${versions.length + 1}</span>
                            </button>
                        </form>
                    </div>
                ` : ''}
            `;

            if(isUploader) {
                const uFile = document.getElementById('uFile');
                uFile.addEventListener('change', (e) => {
                    if (e.target.files.length > 0) {
                        document.getElementById('updateFileName').innerText = e.target.files[0].name;
                    }
                });
            }

        } catch (error) {
            console.error(error);
            modalBody.innerHTML = `<div class="empty-state">Error loading details.</div>`;
        }
    },

    async handleUpdate(e, docId) {
        e.preventDefault();
        
        const btnText = document.querySelector('#updateBtn .btn-text');
        try {
            btnText.innerText = "Processing...";
            const file = document.getElementById('uFile').files[0];
            if(!file) throw new Error("No file selected");

            const fileHash = await this.computeFileHash(file);
            const cid = await this.mockIPFSUpload(file);

            btnText.innerText = "Confirm in Wallet...";
            const tx = await this.contract.updateDocument(docId, cid, fileHash);
            
            btnText.innerText = "Awaiting Confirmation...";
            await tx.wait();

            this.showToast(`Document #${docId} Updated Successfully!`);
            this.viewDocumentDetails(docId); // Refresh modal
            this.loadDocuments(); // Refresh grid

        } catch(error) {
            console.error(error);
            this.showToast(error.shortMessage || error.message || "Update failed", "error");
            btnText.innerText = "Publish Rev";
        }
    },

    closeModal() {
        document.getElementById('docModal').classList.remove('active');
    },

    showToast(message, type = "success") {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.borderLeftColor = type === "success" ? "var(--success)" : "var(--danger)";
        toast.innerText = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = "slideIn 0.3s forwards reverse";
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    App.init();
    window.app = App; // Expose for inline handlers
});
