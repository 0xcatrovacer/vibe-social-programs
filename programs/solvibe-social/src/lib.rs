use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod solvibe_social {
    use super::*;

    pub fn create_vibe(ctx: Context<CreateVibe>, topic: String, content: String, vibe_account_bump: u8) -> ProgramResult {

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
        vibe.bump = vibe_account_bump;

        Ok(())
    }

    pub fn update_likes(ctx: Context<UpdateLikes>) -> ProgramResult {
        let vibe = &mut ctx.accounts.vibe;
        
        vibe.likes += 1;
        
        Ok(())
    }

    pub fn delete_vibe(_ctx: Context<DeleteVibe>) -> ProgramResult {
        Ok(())
    }

}

#[derive(Accounts)]
#[instruction(vibe_account_bump: u8)]
pub struct CreateVibe<'info> {
    #[account(init, seeds = [b"vibe_post", author.key().as_ref()], bump = vibe_account_bump, payer = author)]
    pub vibe: Account<'info, Vibe>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateLikes<'info> {
    #[account(mut)]
    pub vibe: Account<'info, Vibe>,
    #[account(mut)]
    pub liker: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct DeleteVibe<'info> {
    #[account(mut, has_one = author, close = author)]
    pub vibe: Account<'info, Vibe>,
    pub author: Signer<'info>,
}

#[account]
#[derive(Default)]
pub struct Vibe {
    pub author: Pubkey,
    pub timestamp: i64,
    pub topic: String,
    pub content: String,
    pub likes: u32,
    bump: u8,
}

#[error]
pub enum ErrorCode {
    #[msg("The provided topic should be 50 characters long maximum.")]
    TopicTooLong,
    #[msg("The provided content should be 300 characters long maximum.")]
    ContentTooLong,
}