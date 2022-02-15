import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolvibeSocial } from "../target/types/solvibe_social";
import * as assert from "assert";
import * as bs58 from "bs58";

describe("solvibe-social", () => {
    anchor.setProvider(anchor.Provider.env());

    const program = anchor.workspace.SolvibeSocial as Program<SolvibeSocial>;

    it("can create a new vibe", async () => {
        const author = program.provider.wallet.publicKey;
        const vibe = anchor.web3.Keypair.generate();

        await program.rpc.createVibe("Vibe!", "Vibe Content!", {
            accounts: {
                vibe: vibe.publicKey,
                author: author,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [vibe],
        });

        const createdVibe = await program.account.vibe.fetch(vibe.publicKey);

        assert.equal(createdVibe.topic, "Vibe!");
        assert.equal(createdVibe.content, "Vibe Content!");
        assert.equal(
            createdVibe.author.toBase58(),
            program.provider.wallet.publicKey.toBase58()
        );
        assert.equal(createdVibe.likes, 0);
        assert.ok(createdVibe.timestamp);
    });

    it("can create vibe from different user", async () => {
        const newUser = anchor.web3.Keypair.generate();
        const vibe = anchor.web3.Keypair.generate();

        const signature = await program.provider.connection.requestAirdrop(
            newUser.publicKey,
            1000000000
        );

        await program.provider.connection.confirmTransaction(signature);

        await program.rpc.createVibe("New User!", "Vibe From New User", {
            accounts: {
                vibe: vibe.publicKey,
                author: newUser.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [newUser, vibe],
        });

        const createdVibe = await program.account.vibe.fetch(vibe.publicKey);

        assert.equal(createdVibe.topic, "New User!");
        assert.equal(createdVibe.content, "Vibe From New User");
        assert.equal(
            createdVibe.author.toBase58(),
            newUser.publicKey.toBase58()
        );
        assert.equal(createdVibe.likes, 0);
        assert.ok(createdVibe.timestamp);
    });

    it("cannot provide topic with more than 50 characters", async () => {
        try {
            const author = program.provider.wallet.publicKey;
            const vibe = anchor.web3.Keypair.generate();

            await program.rpc.createVibe(
                "a".repeat(51),
                "Overshoot Topic Limit",
                {
                    accounts: {
                        vibe: vibe.publicKey,
                        author: author,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    },
                    signers: [vibe],
                }
            );

            assert.fail("Should have failed with 51-character topic");
        } catch (e) {
            assert.equal(
                e.msg,
                "The provided topic should be 50 characters long maximum."
            );
        }
    });

    it("cannot provide content with more than 300 characters", async () => {
        try {
            const vibe = anchor.web3.Keypair.generate();

            await program.rpc.createVibe("Motto", "a".repeat(301), {
                accounts: {
                    vibe: vibe.publicKey,
                    author: program.provider.wallet.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                },
                signers: [vibe],
            });
            assert.fail("Should have failed with a 300-character content.");
        } catch (e) {
            assert.equal(
                e.msg,
                "The provided content should be 300 characters long maximum."
            );
        }
    });

    it("can fetch all vibes", async () => {
        const vibes = await program.account.vibe.all();
        assert.equal(vibes.length, 2);
    });

    it("can filter vibes by author", async () => {
        const newVibe = anchor.web3.Keypair.generate();
        const author = await program.provider.wallet;
        await program.rpc.createVibe("Vibe!", "Another Vibe Content!", {
            accounts: {
                vibe: newVibe.publicKey,
                author: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [newVibe],
        });

        const vibes = await program.account.vibe.all([
            {
                memcmp: {
                    offset: 8,
                    bytes: author.publicKey.toBase58(),
                },
            },
        ]);

        assert.equal(vibes.length, 2);

        vibes.every((vibe) => {
            assert.equal(
                vibe.account.author.toBase58(),
                author.publicKey.toBase58()
            );
        });
    });

    it("can filter vibes by topic", async () => {
        const vibes = await program.account.vibe.all([
            {
                memcmp: {
                    offset: 8 + 32 + 8 + 4,
                    bytes: bs58.encode(Buffer.from("Vibe!")),
                },
            },
        ]);

        assert.equal(vibes.length, 2);
        vibes.every((vibe) => {
            assert.equal(vibe.account.topic, "Vibe!");
        });
    });

    it("can delete vibe", async () => {
        const vibe = anchor.web3.Keypair.generate();
        const author = program.provider.wallet;

        await program.rpc.createVibe("Vibe!", "Vibe to be Deleted", {
            accounts: {
                vibe: vibe.publicKey,
                author: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [vibe],
        });

        const createdVibe = await program.account.vibe.fetch(vibe.publicKey);

        assert.ok(createdVibe !== null);

        await program.rpc.deleteVibe({
            accounts: {
                vibe: vibe.publicKey,
                author: author.publicKey,
            },
        });

        const deletedVibe = await program.account.vibe.fetchNullable(
            vibe.publicKey
        );

        assert.ok(deletedVibe === null);
    });

    it("cannot delete someone else's vibe", async () => {
        const vibe = anchor.web3.Keypair.generate();
        const author = program.provider.wallet;

        await program.rpc.createVibe("Vibe!", "Vibe to be Deleted", {
            accounts: {
                vibe: vibe.publicKey,
                author: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [vibe],
        });

        try {
            await program.rpc.deleteVibe({
                accounts: {
                    vibe: vibe.publicKey,
                    author: anchor.web3.Keypair.generate().publicKey,
                },
            });

            assert.fail("Should have failed for other user");
        } catch (e) {
            const vibeAccount = await program.account.vibe.fetch(
                vibe.publicKey
            );

            assert.equal(vibeAccount.topic, "Vibe!");
            assert.equal(vibeAccount.content, "Vibe to be Deleted");
            assert.equal(
                vibeAccount.author.toBase58(),
                author.publicKey.toBase58()
            );
        }
    });

    it("can like own vibe", async () => {
        const vibe = anchor.web3.Keypair.generate();
        const author = program.provider.wallet;

        await program.rpc.createVibe("Vibe!", "Vibe to be Liked", {
            accounts: {
                vibe: vibe.publicKey,
                author: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [vibe],
        });

        const createdVibe = await program.account.vibe.fetch(vibe.publicKey);

        assert.equal(createdVibe.likes, 0);

        const [likeAccount, likeBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from("vibe_like"),
                    author.publicKey.toBuffer(),
                    vibe.publicKey.toBuffer(),
                ],
                program.programId
            );

        await program.rpc.updateLikes(likeBump, {
            accounts: {
                like: likeAccount.toBase58(),
                vibe: vibe.publicKey,
                liker: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
        });

        const likedVibe = await program.account.vibe.fetch(vibe.publicKey);

        assert.equal(likedVibe.likes, 1);
    });

    it("cannot like own vibe twice", async () => {
        const vibe = anchor.web3.Keypair.generate();
        const author = program.provider.wallet;

        await program.rpc.createVibe("Vibe!", "Vibe to be Liked", {
            accounts: {
                vibe: vibe.publicKey,
                author: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [vibe],
        });

        const createdVibe = await program.account.vibe.fetch(vibe.publicKey);

        assert.equal(createdVibe.likes, 0);

        try {
            const [likeAccount, likeBump] =
                await anchor.web3.PublicKey.findProgramAddress(
                    [
                        Buffer.from("vibe_like"),
                        author.publicKey.toBuffer(),
                        vibe.publicKey.toBuffer(),
                    ],
                    program.programId
                );

            await program.rpc.updateLikes(likeBump, {
                accounts: {
                    like: likeAccount.toBase58(),
                    vibe: vibe.publicKey,
                    liker: author.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                },
            });

            assert.fail();
        } catch (e) {
            assert.ok("Cannot like own vibe twice");
        }
    });

    it("can like someone else's vibe", async () => {
        const vibe = anchor.web3.Keypair.generate();
        const author = anchor.web3.Keypair.generate();

        const signature = await program.provider.connection.requestAirdrop(
            author.publicKey,
            1000000000
        );

        await program.provider.connection.confirmTransaction(signature);

        await program.rpc.createVibe("Vibe!", "Vibe to be Liked", {
            accounts: {
                vibe: vibe.publicKey,
                author: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [vibe, author],
        });

        const createdVibe = await program.account.vibe.fetch(vibe.publicKey);

        assert.equal(createdVibe.likes, 0);

        const liker = program.provider.wallet.publicKey;

        const [likeAccount, likeBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from("vibe_like"),
                    liker.toBuffer(),
                    vibe.publicKey.toBuffer(),
                ],
                program.programId
            );

        await program.rpc.updateLikes(likeBump, {
            accounts: {
                like: likeAccount.toBase58(),
                vibe: vibe.publicKey,
                liker: liker,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
        });

        const likedVibe = await program.account.vibe.fetch(vibe.publicKey);

        assert.equal(likedVibe.likes, 1);
    });

    it("cannot like someone else's vibe twice", async () => {
        const vibe = anchor.web3.Keypair.generate();
        const author = anchor.web3.Keypair.generate();

        const signature = await program.provider.connection.requestAirdrop(
            author.publicKey,
            1000000000
        );

        await program.provider.connection.confirmTransaction(signature);

        await program.rpc.createVibe("Vibe!", "Vibe to be Liked", {
            accounts: {
                vibe: vibe.publicKey,
                author: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [vibe, author],
        });

        const liker = program.provider.wallet.publicKey;

        const [likeAccount, likeBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from("vibe_like"),
                    liker.toBuffer(),
                    vibe.publicKey.toBuffer(),
                ],
                program.programId
            );

        await program.rpc.updateLikes(likeBump, {
            accounts: {
                like: likeAccount.toBase58(),
                vibe: vibe.publicKey,
                liker: liker,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
        });

        try {
            await program.rpc.updateLikes(likeBump, {
                accounts: {
                    like: likeAccount.toBase58(),
                    vibe: vibe.publicKey,
                    liker: liker,
                    systemProgram: anchor.web3.SystemProgram.programId,
                },
            });

            assert.fail();
        } catch (e) {
            assert.ok("Cannot like someone else's vibe twice");
        }
    });

    it("can be liked by someone else", async () => {
        const vibe = anchor.web3.Keypair.generate();
        const author = program.provider.wallet;

        await program.rpc.createVibe("Vibe!", "Vibe to be Liked", {
            accounts: {
                vibe: vibe.publicKey,
                author: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [vibe],
        });

        const createdVibe = await program.account.vibe.fetch(vibe.publicKey);
        assert.equal(createdVibe.likes, 0);

        const newLiker = anchor.web3.Keypair.generate();

        const signature = await program.provider.connection.requestAirdrop(
            newLiker.publicKey,
            1000000000
        );

        await program.provider.connection.confirmTransaction(signature);

        const [likeAccount, likeBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from("vibe_like"),
                    newLiker.publicKey.toBuffer(),
                    vibe.publicKey.toBuffer(),
                ],
                program.programId
            );

        await program.rpc.updateLikes(likeBump, {
            accounts: {
                like: likeAccount,
                vibe: vibe.publicKey,
                liker: newLiker.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [newLiker],
        });
        const likedVibe = await program.account.vibe.fetch(vibe.publicKey);
        assert.equal(likedVibe.likes, 1);
    });

    it("can like same vibe by different users", async () => {
        const vibe = anchor.web3.Keypair.generate();
        const author = program.provider.wallet;

        await program.rpc.createVibe("Vibe!", "Vibe to be Liked", {
            accounts: {
                vibe: vibe.publicKey,
                author: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [vibe],
        });

        const createdVibe = await program.account.vibe.fetch(vibe.publicKey);

        assert.equal(createdVibe.likes, 0);

        const [likeAccount, likeBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from("vibe_like"),
                    author.publicKey.toBuffer(),
                    vibe.publicKey.toBuffer(),
                ],
                program.programId
            );

        await program.rpc.updateLikes(likeBump, {
            accounts: {
                like: likeAccount.toBase58(),
                vibe: vibe.publicKey,
                liker: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
        });

        const likedVibe1 = await program.account.vibe.fetch(vibe.publicKey);

        assert.equal(likedVibe1.likes, 1);

        const otherliker1 = anchor.web3.Keypair.generate();

        const signature = await program.provider.connection.requestAirdrop(
            otherliker1.publicKey,
            1000000000
        );

        await program.provider.connection.confirmTransaction(signature);

        const [likeAccount1, likeBump1] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from("vibe_like"),
                    otherliker1.publicKey.toBuffer(),
                    vibe.publicKey.toBuffer(),
                ],
                program.programId
            );

        await program.rpc.updateLikes(likeBump1, {
            accounts: {
                like: likeAccount1.toBase58(),
                vibe: vibe.publicKey,
                liker: otherliker1.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [otherliker1],
        });

        const likedVibe2 = await program.account.vibe.fetch(vibe.publicKey);

        assert.equal(likedVibe2.likes, 2);

        const otherliker2 = anchor.web3.Keypair.generate();

        const signature2 = await program.provider.connection.requestAirdrop(
            otherliker2.publicKey,
            1000000000
        );

        await program.provider.connection.confirmTransaction(signature2);

        const [likeAccount2, likeBump2] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from("vibe_like"),
                    otherliker2.publicKey.toBuffer(),
                    vibe.publicKey.toBuffer(),
                ],
                program.programId
            );

        await program.rpc.updateLikes(likeBump2, {
            accounts: {
                like: likeAccount2.toBase58(),
                vibe: vibe.publicKey,
                liker: otherliker2.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [otherliker2],
        });

        const likedVibe3 = await program.account.vibe.fetch(vibe.publicKey);

        assert.equal(likedVibe3.likes, 3);
    });
});
