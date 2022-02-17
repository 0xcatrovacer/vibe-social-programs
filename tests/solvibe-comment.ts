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

        const createdComment = await program.account.comment.fetch(
            commentAccount
        );

        assert.equal(
            createdComment.commentor.toBase58(),
            author.publicKey.toBase58()
        );
        assert.equal(createdComment.comment, "New Comment");
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
