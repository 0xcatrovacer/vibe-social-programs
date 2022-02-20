import * as anchor from "@project-serum/anchor";
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

        const [userAccount, userBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [Buffer.from("vibe_user"), followed.publicKey.toBuffer()],
                program.programId
            );

        await program.rpc.createUser("Ethan", "eth1234", userBump, {
            accounts: {
                userAccount: userAccount,
                author: followed.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [followed],
        });

        const [followAccount, followBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from("follow_one"),
                    userAccount.toBuffer(),
                    author.publicKey.toBuffer(),
                ],
                program.programId
            );

        await program.rpc.followOne(followBump, {
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
        assert.equal(follow.bump, followBump);
    });

    it("cannot follow already followed user", async () => {
        const author = program.provider.wallet;

        const followed = anchor.web3.Keypair.generate();

        const signature = await program.provider.connection.requestAirdrop(
            followed.publicKey,
            1000000000
        );

        await program.provider.connection.confirmTransaction(signature);

        const [userAccount, userBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [Buffer.from("vibe_user"), followed.publicKey.toBuffer()],
                program.programId
            );

        await program.rpc.createUser("Catrovacer", "catrovacer.sol", userBump, {
            accounts: {
                userAccount: userAccount,
                author: followed.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [followed],
        });

        const [followAccount, followBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from("follow_one"),
                    userAccount.toBuffer(),
                    author.publicKey.toBuffer(),
                ],
                program.programId
            );

        await program.rpc.followOne(followBump, {
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
        assert.equal(follow.bump, followBump);

        try {
            await program.rpc.followOne(followBump, {
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

        const [userAccount, userBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [Buffer.from("vibe_user"), followed.publicKey.toBuffer()],
                program.programId
            );

        await program.rpc.createUser("Batman", "batcave", userBump, {
            accounts: {
                userAccount: userAccount,
                author: followed.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [followed],
        });

        const [followAccount, followBump] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from("follow_one"),
                    userAccount.toBuffer(),
                    author.publicKey.toBuffer(),
                ],
                program.programId
            );

        await program.rpc.followOne(followBump, {
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
        assert.equal(follow.bump, followBump);

        await program.rpc.unfollow(followBump, {
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
