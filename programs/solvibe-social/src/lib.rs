use anchor_lang::prelude::*;

declare_id!("3NcczXqNpzUsp6c2pGqLNJMnUwScvZBXduj8f3sg6Qdz");

#[program]
pub mod solvibe_social {
    use super::*;

    pub fn create_user(ctx: Context<CreateUser>, name: String, username: String) ->  Result<()>  {
        let user = &mut ctx.accounts.user_account;
        let author = &mut ctx.accounts.author;

        if name.chars().count() > 20 {
            return Err(ErrorCode::NameTooLong.into())
        }

        if username.chars().count() > 20 {
            return Err(ErrorCode::NameTooLong.into())
        }

        user.user_key =  *author.key;
        user.bump = *ctx.bumps.get("user_account").unwrap();
        user.name = name;
        user.username = username;

        Ok(())
    }

    pub fn update_name(ctx: Context<UpdateName>, newname: String) ->  Result<()>  {
        
        let user = &mut ctx.accounts.user_account;
        
        if newname.chars().count() > 20 {
            return Err(ErrorCode::NameTooLong.into())
        }

        user.name = newname;

        Ok(())
    }

    pub fn create_vibe(ctx: Context<CreateVibe>, topic: String, content: String) ->  Result<()>  {

        let vibe = &mut ctx.accounts.vibe;
        let author = &mut ctx.accounts.author;
        let clock = Clock::get().unwrap();
        
        if topic.chars().count() > 50 {
            return Err(ErrorCode::TopicTooLong.into())
        }

        if content.chars().count() > 300 {
            return Err(ErrorCode::ContentTooLong.into())
        }
        
        vibe.author = *author.key;
        vibe.timestamp = clock.unix_timestamp;
        vibe.topic = topic;
        vibe.content = content;
        vibe.likes = 0;
        vibe.comments = 0;

        Ok(())
    }

    pub fn update_likes(ctx: Context<UpdateLikes>) ->  Result<()>  {
        let vibe = &mut ctx.accounts.vibe;
        let like = &mut ctx.accounts.like;
        
        like.bump = *ctx.bumps.get("like").unwrap();
        vibe.likes += 1;
        
        Ok(())
    }

    pub fn remove_like(ctx: Context<RemoveLike>) ->  Result<()>  {
        let vibe = &mut ctx.accounts.vibe;
    
        vibe.likes -= 1;
        Ok(())
    }

    pub fn delete_vibe(_ctx: Context<DeleteVibe>) ->  Result<()>  {
        Ok(())
    }

    pub fn add_comment(ctx: Context<AddComment>, comment: String) ->  Result<()>  {
        let comment_account = &mut ctx.accounts.comment;
        let commentor = &mut ctx.accounts.commentor;
        let vibe = &mut ctx.accounts.vibe;

        if comment.chars().count() > 150 {
            return Err(ErrorCode::CommentTooLong.into())
        }

        comment_account.vibe = vibe.key();
        comment_account.commentor = *commentor.key;
        comment_account.comment = comment;
        
        comment_account.bump = *ctx.bumps.get("comment").unwrap();

        vibe.comments += 1;

        Ok(())
    }

    pub fn remove_comment(ctx: Context<RemoveComment>) ->  Result<()>  {
        let vibe = &mut ctx.accounts.vibe;
        vibe.comments -= 1;
        Ok(())
    }

    pub fn follow_one(ctx: Context<FollowOne>) ->  Result<()>  {
        let follow = &mut ctx.accounts.follow;
        let follower = &mut ctx.accounts.follower;
        let followed = &mut ctx.accounts.followed;

        follow.followed = followed.key();
        follow.follower = *follower.key;
        follow.bump = *ctx.bumps.get("follow").unwrap();
        
        // followed.followers += 1;
        
        Ok(())
    }

    pub fn unfollow(_ctx: Context<UnFollow>) ->  Result<()>  {
        // let followed = &mut ctx.accounts.followed;

        // followed.followers -= 1;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateUser<'info> {
    #[account(init, seeds = [b"vibe_user", author.key().as_ref()], bump, payer = author, space = User::LEN)]
    pub user_account: Account<'info, User>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateName<'info> {
    #[account(mut, seeds = [b"vibe_user", author.key().as_ref()], bump = user_account.bump)]
    pub user_account: Account<'info, User>,
    #[account(mut)]
    pub author: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateVibe<'info> {
    #[account(init, payer = author, space = Vibe::LEN)]
    pub vibe: Account<'info, Vibe>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateLikes<'info> {
    #[account(init, seeds = [b"vibe_like", liker.key().as_ref(), vibe.key().as_ref()], bump, payer = liker, space = Like::LEN )]
    pub like: Account<'info, Like>,
    #[account(mut)]
    pub vibe: Account<'info, Vibe>,
    #[account(mut)]
    pub liker: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveLike<'info> {
    #[account(mut, seeds = [b"vibe_like", liker.key().as_ref(), vibe.key().as_ref()], bump = like.bump, close = liker)]
    pub like: Account<'info, Like>,
    #[account(mut)]
    pub vibe: Account<'info, Vibe>,
    #[account(mut)]
    pub liker: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeleteVibe<'info> {
    #[account(mut, has_one = author, close = author)]
    pub vibe: Account<'info, Vibe>,
    #[account(mut)]
    pub author: Signer<'info>,
}

#[derive(Accounts)]
pub struct AddComment<'info> {
    #[account(init, seeds=[b"vibe_comment", commentor.key().as_ref(), vibe.key().as_ref()], bump, payer = commentor, space = Comment::LEN)]
    pub comment: Account<'info, Comment>,
    #[account(mut)]
    pub vibe: Account<'info, Vibe>,
    #[account(mut)]
    pub commentor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveComment<'info> {
    #[account(mut, seeds=[b"vibe_comment", commentor.key().as_ref(), vibe.key().as_ref()], bump = comment.bump, close = commentor)]
    pub comment: Account<'info, Comment>,
    #[account(mut)]
    pub vibe: Account<'info, Vibe>,
    #[account(mut)]
    pub commentor: Signer<'info>,
}

#[derive(Accounts)]
pub struct FollowOne<'info> {
    #[account(init, seeds=[b"follow_one", followed.key().as_ref(), follower.key().as_ref()], bump, payer = follower, space = Follow::LEN)]
    pub follow: Account<'info, Follow>,
    #[account(mut)]
    pub followed: AccountInfo<'info>,
    #[account(mut)]
    pub follower: Signer<'info>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct UnFollow<'info> {
    #[account(mut, seeds=[b"follow_one", followed.key().as_ref(), follower.key().as_ref()], bump = follow.bump, close = follower)]
    pub follow: Account<'info, Follow>,
    #[account(mut)]
    pub followed: AccountInfo<'info>,
    #[account(mut)]
    pub follower: Signer<'info>,
}

#[account]
pub struct User {
    pub user_key: Pubkey,
    pub bump: u8,
    pub followers: u32,
    pub name: String,
    pub username: String,
}

#[account]
pub struct Vibe {
    pub author: Pubkey,
    pub timestamp: i64,
    pub topic: String,
    pub content: String,
    pub likes: u32,
    pub comments: u32,
}

#[account]
pub struct Like {
    pub bump: u8,
}

#[account]
pub struct Comment {
    pub vibe: Pubkey,
    pub commentor: Pubkey,
    pub comment: String,
    pub bump: u8,
}

#[account]
pub struct Follow {
    pub followed: Pubkey,
    pub follower: Pubkey,
    pub bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The provided name should be 20 characters long maximum")]
    NameTooLong,
    #[msg("The provided topic should be 50 characters long maximum.")]
    TopicTooLong,
    #[msg("The provided content should be 300 characters long maximum.")]
    ContentTooLong,
    #[msg("The provided comment should be 150 characters long maximum.")]
    CommentTooLong,
}


//Size of an User
const USER_DISCRIMINATOR_LENGTH: usize = 8;
const USER_PUBLIC_KEY_LENGTH: usize = 32;
const USER_FOLLOWERS_LENGTH: usize = 4;
const MAX_USER_BUMP_SIZE: usize = 1;
const USER_STRING_LENGTH_PREFIX: usize = 4;
const MAX_NAME_LENGTH: usize = 20 * 4;

impl User {
    const LEN: usize = USER_DISCRIMINATOR_LENGTH
        + USER_PUBLIC_KEY_LENGTH  //Author.
        + USER_FOLLOWERS_LENGTH // Followers.
        + MAX_USER_BUMP_SIZE //Bump.
        + USER_STRING_LENGTH_PREFIX + MAX_NAME_LENGTH //Name.
        + USER_STRING_LENGTH_PREFIX + MAX_NAME_LENGTH; //Username.
}

//Size of a Vibe
const VIBE_DISCRIMINATOR_LENGTH: usize = 8;
const PUBLIC_KEY_LENGTH: usize = 32;
const TIMESTAMP_LENGTH: usize = 8;
const STRING_LENGTH_PREFIX: usize = 4;
const MAX_TOPIC_LENGTH: usize = 50 * 4;
const MAX_CONTENT_LENGTH: usize = 300 * 4;
const MAX_LIKES_LENGTH: usize = 4;
const MAX_COMMENT_NUMBER_LENGTH: usize = 4;

impl Vibe {
    const LEN: usize = VIBE_DISCRIMINATOR_LENGTH
        + PUBLIC_KEY_LENGTH // Author.
        + TIMESTAMP_LENGTH // Timestamp.
        + STRING_LENGTH_PREFIX + MAX_TOPIC_LENGTH // Topic.
        + STRING_LENGTH_PREFIX + MAX_CONTENT_LENGTH // Content.
        + MAX_LIKES_LENGTH // Likes.
        + MAX_COMMENT_NUMBER_LENGTH; // Comments.

}

//Size of a Like
const LIKE_DISCRIMINATOR_LENGTH: usize = 8;
const MAX_BUMP_SIZE: usize = 1;
impl Like {
    const LEN: usize = LIKE_DISCRIMINATOR_LENGTH
        + MAX_BUMP_SIZE; //Bump.
}

//Size of Comment
const COMMENT_DISCRIMINATOR_LENGTH: usize = 8;
const VIBE_PUBLIC_KEY_LENGTH: usize = 32;
const COMMENTOR_PUBLIC_KEY_LENGTH: usize = 32;
const COMMENT_STRING_LENGTH_PREFIX: usize = 4;
const MAX_COMMENT_LENGTH: usize = 150 * 4;

impl Comment {
    const LEN: usize = COMMENT_DISCRIMINATOR_LENGTH
        + VIBE_PUBLIC_KEY_LENGTH //Vibe.
        + COMMENTOR_PUBLIC_KEY_LENGTH //Commentor.
        + COMMENT_STRING_LENGTH_PREFIX + MAX_COMMENT_LENGTH; //Comment.
}

//Size of Follow
const FOLLOW_DISCRIMINATOR_LENGTH: usize = 8;
const FOLLOWER_USER_PUBLIC_KEY_LENGTH: usize = 32;
const FOLLOWED_USER_PUBLIC_KEY_LENGTH: usize = 32;
const FOLLOW_BUMP: usize = 2;

impl Follow {
    const LEN: usize = FOLLOW_DISCRIMINATOR_LENGTH
        + FOLLOWED_USER_PUBLIC_KEY_LENGTH // Followed
        + FOLLOWER_USER_PUBLIC_KEY_LENGTH // Follower
        + FOLLOW_BUMP; // Bump
}