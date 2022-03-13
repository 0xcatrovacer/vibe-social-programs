import * as anchor from "@project-serum/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program } from "@project-serum/anchor";
import { SolvibeSocial } from "../target/types/solvibe_social";
import * as assert from "assert";

describe("solvibe-likes", () => {
    anchor.setProvider(anchor.Provider.env());

    const program = anchor.workspace.SolvibeSocial as Program<SolvibeSocial>;

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

        const [likeAccount, _] = await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from("vibe_like"),
                author.publicKey.toBuffer(),
                vibe.publicKey.toBuffer(),
            ],
            program.programId
        );

        await program.rpc.updateLikes({
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

        const [likeAccount, _] = await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from("vibe_like"),
                liker.toBuffer(),
                vibe.publicKey.toBuffer(),
            ],
            program.programId
        );

        await program.rpc.updateLikes({
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

        const [likeAccount, _] = await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from("vibe_like"),
                liker.toBuffer(),
                vibe.publicKey.toBuffer(),
            ],
            program.programId
        );

        await program.rpc.updateLikes({
            accounts: {
                like: likeAccount.toBase58(),
                vibe: vibe.publicKey,
                liker: liker,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
        });

        try {
            await program.rpc.updateLikes({
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

        const [likeAccount, _] = await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from("vibe_like"),
                newLiker.publicKey.toBuffer(),
                vibe.publicKey.toBuffer(),
            ],
            program.programId
        );

        await program.rpc.updateLikes({
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

        const [likeAccount, _likeBump1] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("vibe_like"),
                author.publicKey.toBuffer(),
                vibe.publicKey.toBuffer(),
            ],
            program.programId
        );

        await program.rpc.updateLikes({
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

        const [likeAccount1, _] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    anchor.utils.bytes.utf8.encode("vibe_like"),
                    otherliker1.publicKey.toBuffer(),
                    vibe.publicKey.toBuffer(),
                ],
                program.programId
            );

        await program.rpc.updateLikes({
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

        await program.rpc.updateLikes({
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

    it("can like, unlike, like vibe", async () => {
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

        await program.rpc.updateLikes({
            accounts: {
                like: likeAccount.toBase58(),
                vibe: vibe.publicKey,
                liker: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
        });

        const likedVibe = await program.account.vibe.fetch(vibe.publicKey);

        assert.equal(likedVibe.likes, 1);

        await program.rpc.removeLike({
            accounts: {
                like: likeAccount.toBase58(),
                vibe: vibe.publicKey,
                liker: author.publicKey,
            },
        });

        const unLikedVibe = await program.account.vibe.fetch(vibe.publicKey);

        assert.equal(unLikedVibe.likes, 0);

        await program.rpc.updateLikes({
            accounts: {
                like: likeAccount.toBase58(),
                vibe: vibe.publicKey,
                liker: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
        });

        const likedAgainVibe = await program.account.vibe.fetch(vibe.publicKey);

        assert.equal(likedAgainVibe.likes, 1);
    });

    it("cannot unlike previously not liked vibe", async () => {
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

        const [likeAccount, likeBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from("vibe_like"),
                    author.publicKey.toBuffer(),
                    vibe.publicKey.toBuffer(),
                ],
                program.programId
            );

        try {
            await program.rpc.removeLike({
                accounts: {
                    like: likeAccount.toBase58(),
                    vibe: vibe.publicKey,
                    liker: author.publicKey,
                },
            });

            assert.fail("Should have failed unliking not liked vibe");
        } catch (e) {
            assert.ok("Cannot unlike not liked vibe");
        }
    });
});
