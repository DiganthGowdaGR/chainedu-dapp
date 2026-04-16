const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StudyMaterial", function () {
  let StudyMaterial;
  let contract;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    StudyMaterial = await ethers.getContractFactory("StudyMaterial");
    [owner, addr1, addr2] = await ethers.getSigners();
    contract = await StudyMaterial.deploy();
    await contract.waitForDeployment();
  });

  it("Should upload a document", async function () {
    const tx = await contract.uploadDocument("Math 101", "Math", "Calculus notes", "Qm123", "hash123");
    await tx.wait();
    
    // Test that the doc got added and nextDocId incremented
    expect(await contract.nextDocId()).to.equal(2);
    const doc = await contract.documents(1);
    expect(doc.title).to.equal("Math 101");
    expect(doc.versionCount).to.equal(1);
  });

  it("Should update document version if uploader", async function () {
    await contract.connect(addr1).uploadDocument("title", "subj", "desc", "cid1", "hash1");
    // Only addr1 can update
    await expect(
      contract.connect(addr2).updateDocument(1, "cid2", "hash2")
    ).to.be.revertedWith("Only original uploader can update");

    await contract.connect(addr1).updateDocument(1, "cid2", "hash2");
    
    const doc = await contract.documents(1);
    expect(doc.versionCount).to.equal(2);

    const version2 = await contract.documentVersions(1, 2);
    expect(version2.cid).to.equal("cid2");
  });

  it("Should verify a document hash successfully", async function () {
    await contract.uploadDocument("title", "subj", "desc", "cid1", "hash1");
    const isValid = await contract.verifyDocument(1, 1, "hash1");
    expect(isValid).to.equal(true);

    const isInvalid = await contract.verifyDocument(1, 1, "wrong_hash");
    expect(isInvalid).to.equal(false);
  });

  it("Should get all documents and their versions", async function () {
    await contract.uploadDocument("Doc1", "Subj1", "Desc1", "cid1", "hash1");
    await contract.uploadDocument("Doc2", "Subj2", "Desc2", "cid2", "hash2");

    const docs = await contract.getAllDocuments();
    expect(docs.length).to.equal(2);
    expect(docs[0].title).to.equal("Doc1");

    await contract.updateDocument(1, "cid1_v2", "hash1_v2");
    const versions = await contract.getDocumentVersions(1);
    expect(versions.length).to.equal(2);
    expect(versions[1].cid).to.equal("cid1_v2");
  });
});
