// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract StudyMaterial {
    struct Version {
        string cid;
        string fileHash;
        uint256 timestamp;
    }

    struct Document {
        uint256 docId;
        address uploader;
        string title;
        string subject;
        string description;
        uint256 versionCount;
    }

    uint256 public nextDocId = 1;
    
    mapping(uint256 => Document) public documents;
    mapping(uint256 => mapping(uint256 => Version)) public documentVersions;

    event DocumentUploaded(uint256 indexed docId, address indexed uploader, string title);
    event DocumentUpdated(uint256 indexed docId, uint256 newVersionIndex, string cid);

    function uploadDocument(string memory _title, string memory _subject, string memory _description, string memory _cid, string memory _fileHash) public returns (uint256) {
        uint256 docId = nextDocId++;
        
        documents[docId] = Document({
            docId: docId,
            uploader: msg.sender,
            title: _title,
            subject: _subject,
            description: _description,
            versionCount: 1
        });

        documentVersions[docId][1] = Version({
            cid: _cid,
            fileHash: _fileHash,
            timestamp: block.timestamp
        });

        emit DocumentUploaded(docId, msg.sender, _title);
        return docId;
    }

    function updateDocument(uint256 _docId, string memory _cid, string memory _fileHash) public {
        require(_docId < nextDocId && _docId > 0, "Document does not exist");
        Document storage doc = documents[_docId];
        require(msg.sender == doc.uploader, "Only original uploader can update");

        doc.versionCount++;
        uint256 newVersionIndex = doc.versionCount;

        documentVersions[_docId][newVersionIndex] = Version({
            cid: _cid,
            fileHash: _fileHash,
            timestamp: block.timestamp
        });

        emit DocumentUpdated(_docId, newVersionIndex, _cid);
    }

    function verifyDocument(uint256 _docId, uint256 _version, string memory _fileHash) public view returns (bool) {
        require(_docId < nextDocId && _docId > 0, "Document does not exist");
        require(_version > 0 && _version <= documents[_docId].versionCount, "Version does not exist");

        Version memory version = documentVersions[_docId][_version];
        
        // String comparison in Solidity requires comparing their keccak256 hashes
        return (keccak256(abi.encodePacked(version.fileHash)) == keccak256(abi.encodePacked(_fileHash)));
    }

    function getAllDocuments() public view returns (Document[] memory) {
        Document[] memory allDocs = new Document[](nextDocId - 1);
        for (uint256 i = 1; i < nextDocId; i++) {
            allDocs[i - 1] = documents[i];
        }
        return allDocs;
    }

    function getDocumentVersions(uint256 _docId) public view returns (Version[] memory) {
        require(_docId < nextDocId && _docId > 0, "Document does not exist");
        uint256 vCount = documents[_docId].versionCount;
        
        Version[] memory versions = new Version[](vCount);
        for (uint256 i = 1; i <= vCount; i++) {
            versions[i - 1] = documentVersions[_docId][i];
        }
        return versions;
    }
}
