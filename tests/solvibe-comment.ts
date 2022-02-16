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
    });
});
