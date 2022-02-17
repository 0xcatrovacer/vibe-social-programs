use anchor_lang::prelude::*;

declare_id!("3NcczXqNpzUsp6c2pGqLNJMnUwScvZBXduj8f3sg6Qdz");

#[program]
pub mod solvibe_social {
    use super::*;

    pub fn create_user(ctx: Context<CreateUser>, name: String, username: String, account_user_bump: u8) -> ProgramResult {
        let user = &mut ctx.accounts.user_account;
        let author = &mut ctx.accounts.author;

        user.user_key =  *author.key;
        user.bump = account_user_bump;
        user.name = name;
        user.username = username;

        Ok(())
    }

    pub fn create_vibe(ctx: Context<CreateVibe>, topic: String, content: String) -> ProgramResult {

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

    pub fn update_likes(ctx: Context<UpdateLikes>, like_account_bump: u8) -> ProgramResult {
        let vibe = &mut ctx.accounts.vibe;
        let like = &mut ctx.accounts.like;
        
        like.bump = like_account_bump;
        vibe.likes += 1;
        
        Ok(())
    }

    pub fn remove_like(ctx: Context<RemoveLike>, _like_account_bump: u8) -> ProgramResult {
        let vibe = &mut ctx.accounts.vibe;
    
        vibe.likes -= 1;
        Ok(())
    }

    pub fn delete_vibe(_ctx: Context<DeleteVibe>) -> ProgramResult {
        Ok(())
    }

    pub fn add_comment(ctx: Context<AddComment>, comment: String, comment_account_bump: u8) -> ProgramResult {
        let comment_account = &mut ctx.accounts.comment;
        let commentor = &mut ctx.accounts.commentor;
        let vibe = &mut ctx.accounts.vibe;

        comment_account.vibe = vibe.key();
        comment_account.commentor = *commentor.key;
        comment_account.comment = comment;
        comment_account.bump = comment_account_bump;

        vibe.comments += 1;

        Ok(())
    }

    pub fn remove_comment(ctx: Context<RemoveComment>, _comment_account_bump: u8) -> ProgramResult {
        let vibe = &mut ctx.accounts.vibe;
        vibe.comments += 1;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String, username: String, account_user_bump: u8)]
pub struct CreateUser<'info> {
    #[account(init, seeds = [b"vibe_user", author.key().as_ref()], bump = account_user_bump, payer = author, space = User::LEN)]
    pub user_account: Account<'info, User>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
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
#[instruction(like_account_bump: u8)]
pub struct UpdateLikes<'info> {
    #[account(init, seeds = [b"vibe_like", liker.key().as_ref(), vibe.key().as_ref()], bump = like_account_bump, payer = liker, space = Like::LEN )]
    pub like: Account<'info, Like>,
    #[account(mut)]
    pub vibe: Account<'info, Vibe>,
    #[account(mut)]
    pub liker: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(like_account_bump: u8)]
pub struct RemoveLike<'info> {
    #[account(mut, seeds = [b"vibe_like", liker.key().as_ref(), vibe.key().as_ref()], bump = like_account_bump, close = liker)]
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
#[instruction(comment: String, comment_account_bump: u8)]
pub struct AddComment<'info> {
    #[account(init, seeds=[b"vibe_comment", commentor.key().as_ref(), vibe.key().as_ref()], bump = comment_account_bump, payer = commentor, space = Comment::LEN)]
    pub comment: Account<'info, Comment>,
    #[account(mut)]
    pub vibe: Account<'info, Vibe>,
    #[account(mut)]
    pub commentor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(comment_account_bump: u8)]
pub struct RemoveComment<'info> {
    #[account(mut, seeds=[b"vibe_comment", commentor.key().as_ref(), vibe.key().as_ref()], bump = comment_account_bump, close = commentor)]
    pub comment: Account<'info, Comment>,
    #[account(mut)]
    pub vibe: Account<'info, Vibe>,
    #[account(mut)]
    pub commentor: Signer<'info>,
}

#[account]
pub struct User {
    pub user_key: Pubkey,
    pub bump: u8,
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

#[error]
pub enum ErrorCode {
    #[msg("The provided topic should be 50 characters long maximum.")]
    TopicTooLong,
    #[msg("The provided content should be 300 characters long maximum.")]
    ContentTooLong,
}


//Size of an User
const USER_DISCRIMINATOR_LENGTH: usize = 8;
const USER_PUBLIC_KEY_LENGTH: usize = 32;
const MAX_USER_BUMP_SIZE: usize = 1;
const USER_STRING_LENGTH_PREFIX: usize = 4;
const MAX_NAME_LENGTH: usize = 20 * 4;

impl User {
    const LEN: usize = USER_DISCRIMINATOR_LENGTH
        + USER_PUBLIC_KEY_LENGTH  //Author.
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