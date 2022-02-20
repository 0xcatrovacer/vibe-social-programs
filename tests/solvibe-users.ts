import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolvibeSocial } from "../target/types/solvibe_social";
import * as assert from "assert";

describe("solvibe-users", () => {
    anchor.setProvider(anchor.Provider.env());

    const program = anchor.workspace.SolvibeSocial as Program<SolvibeSocial>;

    it("can create user", async () => {
        const author = program.provider.wallet;

        const [userAccount, userBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [Buffer.from("vibe_user"), author.publicKey.toBuffer()],
                program.programId
            );

        await program.rpc.createUser("New Name", "unique username", userBump, {
            accounts: {
                userAccount: userAccount,
                author: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
        });

        const createdUser = await program.account.user.fetch(userAccount);

        assert.equal(
            createdUser.userKey.toBase58(),
            author.publicKey.toBase58()
        );
        assert.equal(createdUser.name, "New Name");
        assert.equal(createdUser.username, "unique username");
        assert.equal(createdUser.bump, userBump);
    });
});
