import * as anchor from "@project-serum/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program } from "@project-serum/anchor";
import { SolvibeSocial } from "../target/types/solvibe_social";
import * as assert from "assert";

describe("solvibe-follows", () => {
    anchor.setProvider(anchor.Provider.env());

    const program = anchor.workspace.SolvibeSocial as Program<SolvibeSocial>;

    it("can follow user", async () => {
        const author = program.provider.wallet;

        const followed = anchor.web3.Keypair.generate();

        const signature = await program.provider.connection.requestAirdrop(
            followed.publicKey,
            1000000000
        );

        await program.provider.connection.confirmTransaction(signature);

        const [userAccount, _userBump] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("vibe_user"),
                followed.publicKey.toBuffer(),
            ],
            program.programId
        );

        await program.rpc.createUser("Ethan", "eth1234", {
            accounts: {
                userAccount: userAccount,
                author: followed.publicKey,
                systemProgram: SystemProgram.programId,
            },
            signers: [followed],
        });

        const [followAccount, _] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    anchor.utils.bytes.utf8.encode("follow_one"),
                    userAccount.toBuffer(),
                    author.publicKey.toBuffer(),
                ],
                program.programId
            );

        await program.rpc.followOne({
            accounts: {
                follow: followAccount,
                followed: userAccount,
                follower: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
        });

        const follow = await program.account.follow.fetch(followAccount);

        assert.equal(follow.followed.toBase58(), userAccount.toBase58());
        assert.equal(follow.follower.toBase58(), author.publicKey.toBase58());
    });

    it("cannot follow already followed user", async () => {
        const author = program.provider.wallet;

        const followed = anchor.web3.Keypair.generate();

        const signature = await program.provider.connection.requestAirdrop(
            followed.publicKey,
            1000000000
        );

        await program.provider.connection.confirmTransaction(signature);

        const [userAccount, _] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("vibe_user"),
                followed.publicKey.toBuffer(),
            ],
            program.programId
        );

        await program.rpc.createUser("Catrovacer", "catrovacer.sol", {
            accounts: {
                userAccount: userAccount,
                author: followed.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [followed],
        });

        const [followAccount, _followBump] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("follow_one"),
                userAccount.toBuffer(),
                author.publicKey.toBuffer(),
            ],
            program.programId
        );

        await program.rpc.followOne({
            accounts: {
                follow: followAccount,
                followed: userAccount,
                follower: author.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
        });

        const follow = await program.account.follow.fetch(followAccount);

        assert.equal(follow.followed.toBase58(), userAccount.toBase58());
        assert.equal(follow.follower.toBase58(), author.publicKey.toBase58());

        try {
            await program.rpc.followOne({
                accounts: {
                    follow: followAccount,
                    followed: userAccount,
                    follower: author.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                },
            });

            assert.fail("Should have failed following already followed user");
        } catch (e) {
            assert.ok("Cannot follow already followed user");
        }
    });

    it("can unfollow user", async () => {
        const author = program.provider.wallet;

        const followed = anchor.web3.Keypair.generate();

        const signature = await program.provider.connection.requestAirdrop(
            followed.publicKey,
            1000000000
        );

        await program.provider.connection.confirmTransaction(signature);

        const [userAccount, _] = await anchor.web3.PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("vibe_user"),
                followed.publicKey.toBuffer(),
            ],
            program.programId
        );

        await program.rpc.createUser("Batman", "batcave", {
            accounts: {
                userAccount: userAccount,
                author: followed.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [followed],
        });

        const [followAccount, _followBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    anchor.utils.bytes.utf8.encode("follow_one"),
                    userAccount.toBuffer(),
                    author.publicKey.toBuffer(),
                ],
                program.programId
            );

        await program.rpc.followOne({
            accounts: {
                follow: followAccount,
                followed: userAccount,
                follower: author.publicKey,
                systemProgram: SystemProgram.programId,
            },
        });

        const follow = await program.account.follow.fetch(followAccount);

        assert.equal(follow.followed.toBase58(), userAccount.toBase58());
        assert.equal(follow.follower.toBase58(), author.publicKey.toBase58());

        await program.rpc.unfollow({
            accounts: {
                follow: followAccount,
                followed: userAccount,
                follower: author.publicKey,
            },
        });

        const unfollowed = await program.account.follow.fetchNullable(
            followAccount
        );
        assert.ok(unfollowed === null);
    });
});
