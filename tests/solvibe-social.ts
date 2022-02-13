import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolvibeSocial } from "../target/types/solvibe_social";
import * as assert from "assert";
import * as bs58 from "bs58";

describe("solvibe-social", () => {
    anchor.setProvider(anchor.Provider.env());

    const program = anchor.workspace.SolvibeSocial as Program<SolvibeSocial>;

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
            const vibe = anchor.web3.Keypair.generate();

            await program.rpc.createVibe(
                "a".repeat(51),
                "Overshoot Topic Limit",
                {
                    accounts: {
                        vibe: vibe.publicKey,
                        author: program.provider.wallet.publicKey,
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
});
