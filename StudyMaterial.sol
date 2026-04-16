// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract StudyMaterial {

    struct Version {
        uint256 versionNumber;
        string  ipfsCID;
        bytes32 fileHash;
        string  changeNote;
        uint256 timestamp;
    }

    struct Document {
        uint256 docId;
        address uploader;
        string  title;
        string  subject;
        string  description;
        uint256 uploadedAt;
        bool    exists;
        uint256 versionCount;
    }

    uint256 private docCounter;

    mapping(uint256 => Document) private documents;
    mapping(uint256 => mapping(uint256 => Version)) private versions;
    mapping(address => uint256[]) private uploaderDocs;
    mapping(string => uint256[]) private subjectDocs;
    string[] private allSubjects;
    mapping(string => bool) private subjectExists;

    event DocumentUploaded(uint256 indexed docId, address indexed uploader, string title, string subject, string ipfsCID, bytes32 fileHash, uint256 timestamp);
    event DocumentUpdated(uint256 indexed docId, address indexed uploader, uint256 newVersionNumber, string newIpfsCID, bytes32 newFileHash, string changeNote, uint256 timestamp);

    modifier onlyUploader(uint256 _docId) {
        require(documents[_docId].exists, "Document does not exist");
        require(documents[_docId].uploader == msg.sender, "Only original uploader can revise");
        _;
    }

    modifier docExists(uint256 _docId) {
        require(documents[_docId].exists, "Document does not exist");
        _;
    }

    function uploadDocument(string memory _title, string memory _subject, string memory _description, string memory _ipfsCID, bytes32 _fileHash) external returns (uint256 docId) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_subject).length > 0, "Subject cannot be empty");
        require(bytes(_ipfsCID).length > 0, "IPFS CID cannot be empty");
        require(_fileHash != bytes32(0), "File hash cannot be zero");

        docCounter++;
        docId = docCounter;

        documents[docId] = Document(docId, msg.sender, _title, _subject, _description, block.timestamp, true, 1);
        versions[docId][1] = Version(1, _ipfsCID, _fileHash, "Initial upload", block.timestamp);

        uploaderDocs[msg.sender].push(docId);
        subjectDocs[_subject].push(docId);
        if (!subjectExists[_subject]) {
            allSubjects.push(_subject);
            subjectExists[_subject] = true;
        }

        emit DocumentUploaded(docId, msg.sender, _title, _subject, _ipfsCID, _fileHash, block.timestamp);
    }

    function updateDocument(uint256 _docId, string memory _newIpfsCID, bytes32 _newFileHash, string memory _changeNote) external onlyUploader(_docId) {
        require(bytes(_newIpfsCID).length > 0, "IPFS CID cannot be empty");
        require(_newFileHash != bytes32(0), "File hash cannot be zero");
        require(bytes(_changeNote).length > 0, "Change note cannot be empty");

        uint256 newVersion = documents[_docId].versionCount + 1;
        documents[_docId].versionCount = newVersion;
        versions[_docId][newVersion] = Version(newVersion, _newIpfsCID, _newFileHash, _changeNote, block.timestamp);

        emit DocumentUpdated(_docId, msg.sender, newVersion, _newIpfsCID, _newFileHash, _changeNote, block.timestamp);
    }

    function verifyDocument(uint256 _docId, uint256 _versionNumber, bytes32 _localFileHash) external view docExists(_docId) returns (bool isAuthentic, bytes32 storedHash) {
        require(_versionNumber >= 1 && _versionNumber <= documents[_docId].versionCount, "Invalid version");
        storedHash = versions[_docId][_versionNumber].fileHash;
        isAuthentic = (storedHash == _localFileHash);
    }

    function getDocument(uint256 _docId) external view docExists(_docId) returns (Document memory) {
        return documents[_docId];
    }

    function getVersion(uint256 _docId, uint256 _versionNumber) external view docExists(_docId) returns (Version memory) {
        require(_versionNumber >= 1 && _versionNumber <= documents[_docId].versionCount, "Invalid version");
        return versions[_docId][_versionNumber];
    }

    function getLatestVersion(uint256 _docId) external view docExists(_docId) returns (Version memory) {
        return versions[_docId][documents[_docId].versionCount];
    }

    function getVersionHistory(uint256 _docId) external view docExists(_docId) returns (Version[] memory history) {
        uint256 count = documents[_docId].versionCount;
        history = new Version[](count);
        for (uint256 i = 1; i <= count; i++) {
            history[i - 1] = versions[_docId][i];
        }
    }

    function getDocumentsByUploader(address _uploader) external view returns (uint256[] memory) {
        return uploaderDocs[_uploader];
    }

    function getDocumentsBySubject(string memory _subject) external view returns (uint256[] memory) {
        return subjectDocs[_subject];
    }

    function getAllSubjects() external view returns (string[] memory) {
        return allSubjects;
    }

    function getTotalDocuments() external view returns (uint256) {
        return docCounter;
    }
}