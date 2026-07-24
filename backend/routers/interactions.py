from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

import schemas
from auth_service import get_current_user
from db.models import User, Product, Shop, Reservation, ReservationStatus, Review, Notification, Favorite, Follower
from db.session import get_db

router = APIRouter(tags=["Interactions"])


@router.post("/shops/{shop_id}/reviews", response_model=schemas.ReviewResponse, status_code=status.HTTP_201_CREATED)
def leave_review(
    shop_id: str,
    review_in: schemas.ReviewCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if user.is_shop_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Shop owners cannot leave reviews."
        )
        
    shop = db.get(Shop, shop_id)
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found")
        
    # verify they actually bought something here
    completed_res = db.query(Reservation).filter(
        Reservation.user_id == user.id,
        Reservation.shop_id == shop.id,
        Reservation.status == ReservationStatus.COMPLETED
    ).first()
    
    if not completed_res:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="You must complete a reservation at this shop before reviewing."
        )
        
    review = Review(
        user_id=user.id,
        shop_id=shop.id,
        rating=review_in.rating,
        comment=review_in.comment
    )
    db.add(review)
    
    # Update shop rating
    shop.rating_count += 1
    total_rating = (shop.average_rating * (shop.rating_count - 1)) + review.rating
    shop.average_rating = round(total_rating / shop.rating_count, 1)
    
    db.commit()
    db.refresh(review)
    return review


@router.get("/notifications", response_model=list[schemas.NotificationResponse])
def get_my_notifications(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return db.query(Notification).filter(Notification.user_id == user.id).order_by(Notification.created_at.desc()).all()


@router.post("/notifications/read")
def mark_all_notifications_as_read(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    db.query(Notification).filter(Notification.user_id == user.id, Notification.is_read == False).update(
        {Notification.is_read: True}, synchronize_session=False
    )
    db.commit()
    return {"message": "All notifications marked as read"}


@router.post("/favorites/", response_model=schemas.FavoriteResponse, status_code=status.HTTP_201_CREATED)
def add_favorite(
    fav_in: schemas.FavoriteCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    product = db.get(Product, fav_in.product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        
    existing = db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.product_id == product.id).first()
    if existing:
        # Preload product and shop
        return db.query(Favorite).options(joinedload(Favorite.product).joinedload(Product.shop))\
            .filter(Favorite.id == existing.id).first()
        
    favorite = Favorite(user_id=user.id, product_id=product.id)
    db.add(favorite)
    db.commit()
    
    # Preload for serialized response schema
    return db.query(Favorite).options(joinedload(Favorite.product).joinedload(Product.shop))\
        .filter(Favorite.id == favorite.id).first()


@router.get("/favorites/me", response_model=list[schemas.FavoriteResponse])
def get_my_favorites(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return db.query(Favorite).filter(Favorite.user_id == user.id)\
        .options(joinedload(Favorite.product).joinedload(Product.shop))\
        .order_by(Favorite.created_at.desc()).all()


@router.delete("/favorites/{product_id}")
def remove_favorite(
    product_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    fav = db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.product_id == product_id).first()
    if not fav:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Favorite not found")
        
    db.delete(fav)
    db.commit()
    return {"message": "Favorite removed"}


@router.post("/shops/{shop_id}/follow", response_model=schemas.FollowerResponse, status_code=status.HTTP_201_CREATED)
def follow_shop(
    shop_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    shop = db.get(Shop, shop_id)
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found")
        
    existing = db.query(Follower).filter(Follower.user_id == user.id, Follower.shop_id == shop.id).first()
    if existing:
        return db.query(Follower).options(joinedload(Follower.shop))\
            .filter(Follower.id == existing.id).first()
        
    follower = Follower(user_id=user.id, shop_id=shop.id)
    db.add(follower)
    db.commit()
    
    return db.query(Follower).options(joinedload(Follower.shop))\
        .filter(Follower.id == follower.id).first()


@router.delete("/shops/{shop_id}/follow")
def unfollow_shop(
    shop_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    follower = db.query(Follower).filter(Follower.user_id == user.id, Follower.shop_id == shop_id).first()
    if not follower:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not following this shop")
        
    db.delete(follower)
    db.commit()
    return {"message": "Unfollowed successfully"}


@router.get("/users/me/following", response_model=list[schemas.FollowerResponse])
def get_my_following(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return db.query(Follower).filter(Follower.user_id == user.id)\
        .options(joinedload(Follower.shop))\
        .order_by(Follower.created_at.desc()).all()
