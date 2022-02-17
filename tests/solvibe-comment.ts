import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolvibeSocial } from "../target/types/solvibe_social";
import * as assert from "assert";
// import * as bs58 from "bs58";

describe("solvibe-comments", () => {
    anchor.setProvider(anchor.Provider.env());

    const program = anchor.workspace.SolvibeSocial as Program<SolvibeSocial>;

    it("can create comment", async () => {
        const vibe = anchor.web3.Keypair.generate();
        const author = program.provider.wallet;

        await program.rpc.createVibe("New Vibe", "Comment to be Added", {
            accounts: {
                vibe: vibe.publicKey,
                author: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [vibe],
        });

        const [commentAccount, commentBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from("vibe_comment"),
                    author.publicKey.toBuffer(),
                    vibe.publicKey.toBuffer(),
                ],
                program.programId
            );

        await program.rpc.addComment("New Comment", commentBump, {
            accounts: {
                comment: commentAccount,
                vibe: vibe.publicKey,
                commentor: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
        });

        const createdVibe = await program.account.vibe.fetch(vibe.publicKey);
        const createdComment = await program.account.comment.fetch(
            commentAccount
        );

        assert.equal(
            createdComment.commentor.toBase58(),
            author.publicKey.toBase58()
        );
        assert.equal(createdComment.comment, "New Comment");
        assert.equal(createdVibe.comments, 1);
    });

    it("can fetch comments by vibe", async () => {
        const vibe = anchor.web3.Keypair.generate();
        const author = program.provider.wallet;

        await program.rpc.createVibe("New Vibe", "Comment to be Added", {
            accounts: {
                vibe: vibe.publicKey,
                author: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [vibe],
        });

        const [commentAccount, commentBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from("vibe_comment"),
                    author.publicKey.toBuffer(),
                    vibe.publicKey.toBuffer(),
                ],
                program.programId
            );

        await program.rpc.addComment("New Comment", commentBump, {
            accounts: {
                comment: commentAccount,
                vibe: vibe.publicKey,
                commentor: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
        });

        const createdVibe = await program.account.vibe.fetch(vibe.publicKey);
        const createdComment = await program.account.comment.fetch(
            commentAccount
        );

        assert.equal(
            createdComment.commentor.toBase58(),
            author.publicKey.toBase58()
        );
        assert.equal(createdComment.comment, "New Comment");
        assert.equal(createdVibe.comments, 1);

        const newCommentor = await anchor.web3.Keypair.generate();

        const signature = await program.provider.connection.requestAirdrop(
            newCommentor.publicKey,
            1000000000
        );

        await program.provider.connection.confirmTransaction(signature);

        const [newCommentAccount, newCommentBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from("vibe_comment"),
                    newCommentor.publicKey.toBuffer(),
                    vibe.publicKey.toBuffer(),
                ],
                program.programId
            );

        await program.rpc.addComment(
            "New Comment for new commentor",
            newCommentBump,
            {
                accounts: {
                    comment: newCommentAccount,
                    vibe: vibe.publicKey,
                    commentor: newCommentor.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                },
                signers: [newCommentor],
            }
        );

        const createdComments = await program.account.comment.all([
            {
                memcmp: {
                    offset: 8,
                    bytes: vibe.publicKey.toBase58(),
                },
            },
        ]);

        console.log(createdComments.length, 2);
    });

    it("can delete a comment", async () => {
        const vibe = anchor.web3.Keypair.generate();
        const author = program.provider.wallet;

        await program.rpc.createVibe("New Vibe", "Comment to be Added", {
            accounts: {
                vibe: vibe.publicKey,
                author: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [vibe],
        });

        const [commentAccount, commentBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from("vibe_comment"),
                    author.publicKey.toBuffer(),
                    vibe.publicKey.toBuffer(),
                ],
                program.programId
            );

        await program.rpc.addComment("New Comment", commentBump, {
            accounts: {
                comment: commentAccount,
                vibe: vibe.publicKey,
                commentor: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
        });

        const createdComment = await program.account.comment.fetch(
            commentAccount
        );

        assert.equal(
            createdComment.commentor.toBase58(),
            author.publicKey.toBase58()
        );
        assert.ok(createdComment !== null);

        await program.rpc.removeComment(commentBump, {
            accounts: {
                comment: commentAccount,
                vibe: vibe.publicKey,
                commentor: author.publicKey,
            },
        });

        const deleltedComment = await program.account.comment.fetchNullable(
            commentAccount
        );

        assert.ok(deleltedComment === null);
    });
});
