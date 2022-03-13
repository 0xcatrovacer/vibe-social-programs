import * as anchor from "@project-serum/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program } from "@project-serum/anchor";
import { SolvibeSocial } from "../target/types/solvibe_social";
import * as assert from "assert";

describe("solvibe-users", () => {
    anchor.setProvider(anchor.Provider.env());

    const program = anchor.workspace.SolvibeSocial as Program<SolvibeSocial>;

    it("can create user", async () => {
        const author = program.provider.wallet;

        const [userAccountPDA, _] = await PublicKey.findProgramAddress(
            [Buffer.from("vibe_user"), author.publicKey.toBuffer()],
            program.programId
        );

        await program.rpc.createUser("New Name", "unique", {
            accounts: {
                userAccount: userAccountPDA,
                author: author.publicKey,
                systemProgram: SystemProgram.programId,
            },
        });

        const createdUser = await program.account.user.fetch(userAccountPDA);

        assert.equal(
            createdUser.userKey.toBase58(),
            author.publicKey.toBase58()
        );
        assert.equal(createdUser.name, "New Name");
        assert.equal(createdUser.username, "unique");
    });
});
