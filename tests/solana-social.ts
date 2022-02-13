import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaSocial } from "../target/types/solana_social";
import * as assert from "assert";
import * as bs58 from "bs58";

describe("solana-social", () => {
    anchor.setProvider(anchor.Provider.env());

    const program = anchor.workspace.SolanaSocial as Program<SolanaSocial>;

    it("can create a new vibe", async () => {
        const vibe = anchor.web3.Keypair.generate();

        await program.rpc.createVibe("First Vibe!", "Vibe Content!", {
            accounts: {
                vibe: vibe.publicKey,
                author: program.provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [vibe],
        });

        const createdVibe = await program.account.vibe.fetch(vibe.publicKey);

        assert.equal(createdVibe.topic, "First Vibe!");
        assert.equal(createdVibe.content, "Vibe Content!");
        assert.equal(
            createdVibe.author.toBase58(),
            program.provider.wallet.publicKey.toBase58()
        );
        assert.equal(createdVibe.likes, 0);
        assert.ok(createdVibe.timestamp);
    });
});
