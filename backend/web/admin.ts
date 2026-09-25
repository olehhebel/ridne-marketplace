export async function ownerDashboard(db: any) {
  const results = await Promise.all([
    db
      .from("seller_profiles")
      .select(
        "id,user_id,display_name,producer_type,email,phone,oblast,locality,story,fulfillment_options,verification_status,rejection_reason,submitted_at,created_at,contact_preference,marketplace_users(telegram_user_id,telegram_username,first_name,last_name)",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("products")
      .select(
        "id,title,description,price_uah,unit,available_quantity,origin_oblast,origin_locality,storage_requirements,ingredients,best_before,harvest_or_production_date,fulfillment_options,submitted_at,created_at,status,moderation_reason,web_image_path,public_image_urls,listing_payment_status,categories(name_uk,publication_mode),seller_profiles(id,display_name,verification_status,email,phone,marketplace_users(telegram_user_id,telegram_username))",
      )
      .eq("status", "pending")
      .order("submitted_at", { ascending: true })
      .limit(200),
    db
      .from("web_profiles")
      .select(
        "user_id,marketplace_user_id,display_name,email,account_type,producer_type,category_slugs,oblast,locality,created_at,marketplace_users(is_blocked)",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("moderation_events")
      .select(
        "id,target_type,decision,reason,created_at,seller_profiles(display_name),products(title)",
      )
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("moderation_notifications")
      .select("status,last_error,created_at,target_type")
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("registration_notifications")
      .select("status,last_error,created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("marketplace_users")
      .select(
        "id,first_name,last_name,telegram_user_id,telegram_username,phone,role,created_at,is_blocked",
      )
      .not("telegram_user_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  for (const result of results) if (result.error) throw result.error;
  const [
    sellers,
    products,
    users,
    history,
    moderationNotices,
    registrationNotices,
    telegramUsers,
  ] = results.map((r) => r.data || []);
  const rows = await Promise.all(
    products.map(async (p: any) => {
      let image_url = p.public_image_urls?.[0] || null;
      if (!image_url && p.web_image_path) {
        const { data } = await db.storage
          .from("ridne-web-products")
          .createSignedUrl(p.web_image_path, 900);
        image_url = data?.signedUrl || null;
      }
      return { ...p, web_image_path: undefined, image_url };
    }),
  );
  const { data: reviews, error: re } = await db
    .from("seller_review_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (re) throw re;
  for (const r of reviews || []) {
    if (r.reply_file_path) {
      const { data } = await db.storage
        .from(r.reply_file_bucket)
        .createSignedUrl(r.reply_file_path, 900);
      r.file_url = data?.signedUrl || null;
    }
    delete r.reply_file_path;
    delete r.reply_file_bucket;
  }
  return {
    reviews: reviews || [],
    sellers: sellers.filter((s: any) => s.verification_status === "pending"),
    all_sellers: sellers,
    products: rows,
    users,
    telegram_users: telegramUsers,
    history,
    notifications: {
      moderation: moderationNotices,
      registrations: registrationNotices,
    },
  };
}
