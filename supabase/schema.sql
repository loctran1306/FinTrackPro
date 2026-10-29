

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."adjust_wallet_balance"("p_wallet_id" "uuid", "p_real_amount" numeric) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_balance numeric;
  v_diff numeric;
  v_wallet_name text;
BEGIN
  SELECT current_balance, display_name INTO v_current_balance, v_wallet_name 
  FROM public.wallets WHERE id = p_wallet_id AND user_id = v_user_id;

  IF v_wallet_name IS NULL THEN RAISE EXCEPTION 'Ví không tồn tại.'; END IF;

  v_diff := p_real_amount - v_current_balance;
  IF v_diff = 0 THEN RETURN true; END IF;

  INSERT INTO public.transactions (user_id, wallet_id, amount, type, note)
  VALUES (
    v_user_id, 
    p_wallet_id, 
    ABS(v_diff), 
    CASE WHEN v_diff > 0 THEN 'income' ELSE 'expense' END, 
    'Cân đối số dư: ' || v_wallet_name
  );

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."adjust_wallet_balance"("p_wallet_id" "uuid", "p_real_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_allowed_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    -- Chỉ cho phép email cụ thể
    IF NEW.email != 'tranthanhloc130600@gmail.com' THEN
        RAISE EXCEPTION 'Email không được phép đăng nhập: %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_allowed_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_maintain_wallet_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_wallet_type text;
    v_to_wallet_type text;
BEGIN
    -- 1. HOÀN LẠI SỐ DƯ CHO DỮ LIỆU CŨ (Khi DELETE hoặc UPDATE)
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') AND OLD.deleted_at IS NULL THEN
        -- Xử lý Ví Gửi (wallet_id)
        SELECT wallet_type INTO v_wallet_type FROM public.wallets WHERE id = OLD.wallet_id;
        IF OLD.type IN ('expense', 'transfer') THEN
            -- Hoàn lại tiền đã chi/chuyển đi: Ví thường (+), Credit (-)
            UPDATE public.wallets 
            SET current_balance = CASE WHEN v_wallet_type = 'credit' THEN current_balance - OLD.amount ELSE current_balance + OLD.amount END
            WHERE id = OLD.wallet_id;
        ELSIF OLD.type = 'income' THEN
            -- Hoàn lại tiền đã nhận: Ví thường (-), Credit (+)
            UPDATE public.wallets 
            SET current_balance = CASE WHEN v_wallet_type = 'credit' THEN current_balance + OLD.amount ELSE current_balance - OLD.amount END
            WHERE id = OLD.wallet_id;
        END IF;

        -- Xử lý Ví Nhận (to_wallet_id) nếu là transfer
        IF OLD.type = 'transfer' AND OLD.to_wallet_id IS NOT NULL THEN
            SELECT wallet_type INTO v_to_wallet_type FROM public.wallets WHERE id = OLD.to_wallet_id;
            -- Hoàn lại tiền đã nhận vào: Ví thường (-), Credit (+)
            UPDATE public.wallets 
            SET current_balance = CASE WHEN v_to_wallet_type = 'credit' THEN current_balance + OLD.amount ELSE current_balance - OLD.amount END
            WHERE id = OLD.to_wallet_id;
        END IF;
    END IF;

    -- 2. ÁP DỤNG SỐ DƯ CHO DỮ LIỆU MỚI (Khi INSERT hoặc UPDATE)
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.deleted_at IS NULL THEN
        -- Xử lý Ví Gửi (wallet_id)
        SELECT wallet_type INTO v_wallet_type FROM public.wallets WHERE id = NEW.wallet_id;
        IF NEW.type IN ('expense', 'transfer') THEN
            -- Thực hiện chi/chuyển đi: Ví thường (-), Credit (+)
            UPDATE public.wallets 
            SET current_balance = CASE WHEN v_wallet_type = 'credit' THEN current_balance + NEW.amount ELSE current_balance - NEW.amount END
            WHERE id = NEW.wallet_id;
        ELSIF NEW.type = 'income' THEN
            -- Thực hiện nhận tiền: Ví thường (+), Credit (-)
            UPDATE public.wallets 
            SET current_balance = CASE WHEN v_wallet_type = 'credit' THEN current_balance - NEW.amount ELSE current_balance + NEW.amount END
            WHERE id = NEW.wallet_id;
        END IF;

        -- Xử lý Ví Nhận (to_wallet_id) nếu là transfer
        IF NEW.type = 'transfer' AND NEW.to_wallet_id IS NOT NULL THEN
            SELECT wallet_type INTO v_to_wallet_type FROM public.wallets WHERE id = NEW.to_wallet_id;
            -- Thực hiện nhận tiền vào: Ví thường (+), Credit (-)
            UPDATE public.wallets 
            SET current_balance = CASE WHEN v_to_wallet_type = 'credit' THEN current_balance - NEW.amount ELSE current_balance + NEW.amount END
            WHERE id = NEW.to_wallet_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."fn_maintain_wallet_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_category_stats"("p_month" integer, "p_year" integer) RETURNS TABLE("id" "uuid", "name" "text", "icon" "text", "color" "text", "subtext" "text", "amount" numeric, "budget_limit" numeric, "percent_total" numeric, "percent_limit" numeric, "remaining" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_total_month_expense NUMERIC;
  v_days_in_month INT;
  v_days_remaining INT;
BEGIN
  -- 1. Tính tổng CHI TIÊU (expense) dựa trên field 'date'
  SELECT COALESCE(SUM(t.amount::NUMERIC), 0) INTO v_total_month_expense
  FROM transactions t
  WHERE t.user_id = v_user_id 
    AND t.type = 'expense'
    AND t.category_id IS NOT NULL
    AND EXTRACT(MONTH FROM t.date) = p_month 
    AND EXTRACT(YEAR FROM t.date) = p_year;

  -- 2. Tính số ngày còn lại trong tháng
  v_days_in_month := EXTRACT(DAY FROM (date_trunc('month', make_date(p_year, p_month, 1)) + interval '1 month - 1 day'));
  
  IF (p_month = EXTRACT(MONTH FROM CURRENT_DATE) AND p_year = EXTRACT(YEAR FROM CURRENT_DATE)) THEN
    v_days_remaining := GREATEST(1, v_days_in_month - EXTRACT(DAY FROM CURRENT_DATE) + 1);
  ELSE
    v_days_remaining := 1; 
  END IF;

  -- 3. Trả về kết quả join với categories
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.icon,
    c.color,
    (COUNT(t.id) || ' transactions')::TEXT,
    COALESCE(SUM(t.amount::NUMERIC), 0),
    c.limit::NUMERIC, -- Đã thêm dấu phẩy ở đây
    -- % so với tổng chi tiêu trong tháng
    CASE 
      WHEN v_total_month_expense > 0 THEN ROUND((COALESCE(SUM(t.amount::NUMERIC), 0) / v_total_month_expense) * 100, 2)
      ELSE 0 
    END,
    -- % so với hạn mức (limit) của category
    CASE 
      WHEN c.limit > 0 THEN ROUND((COALESCE(SUM(t.amount::NUMERIC), 0) / c.limit) * 100, 2)
      ELSE 0 
    END,
    -- Số tiền còn lại mỗi ngày
    CASE 
      WHEN c.limit > 0 THEN ROUND(GREATEST(0, (c.limit - COALESCE(SUM(t.amount::NUMERIC), 0)) / v_days_remaining), 0)
      ELSE 0 
    END
  FROM categories c
  LEFT JOIN transactions t ON c.id = t.category_id 
    AND t.user_id = v_user_id
    AND t.type = 'expense'
    AND EXTRACT(MONTH FROM t.date) = p_month
    AND EXTRACT(YEAR FROM t.date) = p_year
  WHERE c.user_id = v_user_id
  GROUP BY c.id, c.name, c.icon, c.color, c.limit;
END;
$$;


ALTER FUNCTION "public"."get_category_stats"("p_month" integer, "p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_finance_overview"("p_target_date" timestamp with time zone DEFAULT "now"(), "p_timezone" "text" DEFAULT 'Asia/Ho_Chi_Minh'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    result json;
    v_user_id uuid := auth.uid();
    v_monthly_income numeric;
    v_monthly_expense numeric;
    v_start_month timestamptz; 
    v_end_month timestamptz;
BEGIN
    -- 1. Xác định khoảng thời gian chuẩn (Đầu tháng đến đầu tháng sau theo múi giờ VN)
    v_start_month := date_trunc('month', p_target_date AT TIME ZONE p_timezone) AT TIME ZONE p_timezone;
    v_end_month := v_start_month + interval '1 month';

    -- 2. Tính tổng THU NHẬP (Income)
    SELECT COALESCE(SUM(amount::numeric), 0)
    INTO v_monthly_income
    FROM public.transactions
    WHERE user_id = v_user_id
      AND type = 'income'
      AND date >= v_start_month
      AND date < v_end_month;

    -- 3. Tính tổng CHI TIÊU (Expense)
    SELECT COALESCE(SUM(amount::numeric), 0)
    INTO v_monthly_expense
    FROM public.transactions
    WHERE user_id = v_user_id
      AND type = 'expense'
      AND date >= v_start_month
      AND date < v_end_month;

    -- 4. Gom kết quả tổng hợp từ bảng wallets
    SELECT json_build_object(
        'total_assets', COALESCE(SUM(CASE WHEN wallet_type = 'cash' THEN current_balance ELSE 0 END), 0),
        'total_liabilities', COALESCE(SUM(CASE WHEN wallet_type = 'credit' THEN ABS(current_balance) ELSE 0 END), 0),
        'net_worth', COALESCE(SUM(current_balance), 0),
        'monthly_income', v_monthly_income,
        'monthly_expense', v_monthly_expense,
        'period', v_start_month
    ) INTO result
    FROM public.wallets
    WHERE user_id = v_user_id AND is_active = true;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_finance_overview"("p_target_date" timestamp with time zone, "p_timezone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pull_data"("last_pulled_at" bigint) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  ts_filter     timestamptz;
  res_timestamp bigint;
BEGIN
  ts_filter     := to_timestamp(last_pulled_at / 1000.0);
  res_timestamp := (extract(epoch from now()) * 1000)::bigint;

  RETURN jsonb_build_object(
    'changes', jsonb_build_object(

      -- ── TRANSACTIONS ──────────────────────────────────────────
      'transactions', (
        SELECT jsonb_build_object(
          'created', coalesce(jsonb_agg(r) FILTER (WHERE r.created_at_raw > ts_filter AND r.deleted_at_raw IS NULL), '[]'::jsonb),
          'updated', coalesce(jsonb_agg(r) FILTER (WHERE r.updated_at_raw > ts_filter AND r.created_at_raw <= ts_filter AND r.deleted_at_raw IS NULL), '[]'::jsonb),
          'deleted', coalesce(jsonb_agg(r.id) FILTER (WHERE r.deleted_at_raw > ts_filter), '[]'::jsonb)
        ) FROM (
          SELECT
            id, user_id, category_id, amount, type, note,
            wallet_id, to_wallet_id,
            created_at                                        AS created_at_raw,
            updated_at                                        AS updated_at_raw,
            deleted_at                                        AS deleted_at_raw,
            (extract(epoch from date)       * 1000)::bigint  AS date,
            (extract(epoch from created_at) * 1000)::bigint  AS created_at,
            (extract(epoch from updated_at) * 1000)::bigint  AS updated_at,
            CASE
              WHEN deleted_at IS NULL THEN NULL
              ELSE (extract(epoch from deleted_at) * 1000)::bigint
            END                                               AS deleted_at
          FROM transactions
          WHERE updated_at > ts_filter OR created_at > ts_filter OR deleted_at > ts_filter
        ) r
      ),

      -- ── CATEGORIES ────────────────────────────────────────────
      'categories', (
        SELECT jsonb_build_object(
          'created', coalesce(jsonb_agg(r) FILTER (WHERE r.created_at_raw > ts_filter AND r.deleted_at_raw IS NULL), '[]'::jsonb),
          'updated', coalesce(jsonb_agg(r) FILTER (WHERE r.updated_at_raw > ts_filter AND r.created_at_raw <= ts_filter AND r.deleted_at_raw IS NULL), '[]'::jsonb),
          'deleted', coalesce(jsonb_agg(r.id) FILTER (WHERE r.deleted_at_raw > ts_filter), '[]'::jsonb)
        ) FROM (
          SELECT id, name, "limit", user_id, icon, color,
                 created_at AS created_at_raw,
                 updated_at AS updated_at_raw,
                 deleted_at AS deleted_at_raw,
                 (extract(epoch from created_at) * 1000)::bigint AS created_at,
                 (extract(epoch from coalesce(updated_at, created_at)) * 1000)::bigint AS updated_at,
                 CASE
                   WHEN deleted_at IS NULL THEN NULL
                   ELSE (extract(epoch from deleted_at) * 1000)::bigint
                 END AS deleted_at
          FROM categories
          WHERE updated_at > ts_filter OR created_at > ts_filter OR deleted_at > ts_filter
        ) r
      ),

      -- ── WALLETS ───────────────────────────────────────────────
      'wallets', (
        SELECT jsonb_build_object(
          'created', coalesce(jsonb_agg(r) FILTER (WHERE r.created_at_raw > ts_filter AND r.deleted_at_raw IS NULL), '[]'::jsonb),
          'updated', coalesce(jsonb_agg(r) FILTER (WHERE r.updated_at_raw > ts_filter AND r.created_at_raw <= ts_filter AND r.deleted_at_raw IS NULL), '[]'::jsonb),
          'deleted', coalesce(jsonb_agg(r.id) FILTER (WHERE r.deleted_at_raw > ts_filter), '[]'::jsonb)
        ) FROM (
          SELECT id, user_id, display_name, wallet_type, initial_balance, current_balance,
                 credit_limit, statement_day, payment_due_day, is_active,
                 created_at AS created_at_raw,
                 updated_at AS updated_at_raw,
                 deleted_at AS deleted_at_raw,
                 (extract(epoch from created_at) * 1000)::bigint AS created_at,
                 (extract(epoch from updated_at) * 1000)::bigint AS updated_at,
                 CASE
                   WHEN deleted_at IS NULL THEN NULL
                   ELSE (extract(epoch from deleted_at) * 1000)::bigint
                 END AS deleted_at
          FROM wallets
          WHERE updated_at > ts_filter OR created_at > ts_filter OR deleted_at > ts_filter
        ) r
      ),

      -- ── INSTALLMENTS ──────────────────────────────────────────
      'installments', (
        SELECT jsonb_build_object(
          'created', coalesce(jsonb_agg(r) FILTER (WHERE r.created_at_raw > ts_filter AND r.deleted_at_raw IS NULL), '[]'::jsonb),
          'updated', coalesce(jsonb_agg(r) FILTER (WHERE r.updated_at_raw > ts_filter AND r.created_at_raw <= ts_filter AND r.deleted_at_raw IS NULL), '[]'::jsonb),
          'deleted', coalesce(jsonb_agg(r.id) FILTER (WHERE r.deleted_at_raw > ts_filter), '[]'::jsonb)
        ) FROM (
          SELECT id, user_id, wallet_id, name, total_amount, fee_amount, tenure_months, status,
                 created_at AS created_at_raw,
                 updated_at AS updated_at_raw,
                 deleted_at AS deleted_at_raw,
                 (extract(epoch from start_date) * 1000)::bigint AS start_date,
                 (extract(epoch from created_at) * 1000)::bigint AS created_at,
                 (extract(epoch from updated_at) * 1000)::bigint AS updated_at,
                 CASE
                   WHEN deleted_at IS NULL THEN NULL
                   ELSE (extract(epoch from deleted_at) * 1000)::bigint
                 END AS deleted_at
          FROM installments
          WHERE updated_at > ts_filter OR created_at > ts_filter OR deleted_at > ts_filter
        ) r
      ),

      -- ── INSTALLMENT_ITEMS ─────────────────────────────────────
      'installment_items', (
        SELECT jsonb_build_object(
          'created', coalesce(jsonb_agg(r) FILTER (WHERE r.created_at_raw > ts_filter), '[]'::jsonb),
          'updated', coalesce(jsonb_agg(r) FILTER (WHERE r.updated_at_raw > ts_filter AND r.created_at_raw <= ts_filter), '[]'::jsonb),
          'deleted', '[]'::jsonb -- Giả định item bị xóa theo cha qua CASCADE
        ) FROM (
          SELECT id, installment_id, transaction_id, amount, period_number, status,
                 created_at AS created_at_raw,
                 updated_at AS updated_at_raw,
                 (extract(epoch from due_date) * 1000)::bigint AS due_date,
                 (extract(epoch from created_at) * 1000)::bigint AS created_at,
                 (extract(epoch from updated_at) * 1000)::bigint AS updated_at
          FROM installment_items
          WHERE updated_at > ts_filter OR created_at > ts_filter
        ) r
      )

    ),
    'timestamp', res_timestamp
  );
END;
$$;


ALTER FUNCTION "public"."pull_data"("last_pulled_at" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."push_data"("changes" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  t_name text;
  table_changes jsonb;
  col_updates text;
BEGIN
  FOR t_name IN SELECT jsonb_object_keys(changes)
  LOOP
    table_changes := changes -> t_name;

    IF jsonb_array_length(table_changes -> 'created') > 0 OR jsonb_array_length(table_changes -> 'updated') > 0 THEN
      -- LẤY DANH SÁCH CỘT CẦN UPDATE
      -- LOẠI TRỪ: id, user_id, created_at VÀ current_balance
      SELECT string_agg(format('%I = EXCLUDED.%I', column_name, column_name), ', ')
      INTO col_updates
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = t_name
        AND c.column_name NOT IN ('id', 'user_id', 'created_at', 'current_balance');

      EXECUTE format(
        'INSERT INTO %I SELECT * FROM jsonb_populate_recordset(null::%I, %L) 
         ON CONFLICT (id) DO UPDATE SET %s',
        t_name, t_name, 
        (table_changes -> 'created') || (table_changes -> 'updated'),
        col_updates
      );
    END IF;

    -- Xử lý xóa (Soft Delete)
    IF jsonb_array_length(table_changes -> 'deleted') > 0 THEN
      EXECUTE format(
        'UPDATE %I SET deleted_at = now(), updated_at = now() WHERE id IN (SELECT jsonb_array_elements_text(%L)::uuid)',
        t_name, table_changes -> 'deleted'
      );
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."push_data"("changes" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transfer_money"("p_from_wallet_id" "uuid", "p_to_wallet_id" "uuid", "p_amount" numeric, "p_note" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_from_wallet RECORD;
    v_to_wallet RECORD;
    v_category_id uuid;
BEGIN
    -- 1. Kiểm tra logic cơ bản
    IF p_from_wallet_id = p_to_wallet_id THEN
        RAISE EXCEPTION 'Ví gửi và ví nhận không được trùng nhau.';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Số tiền chuyển phải lớn hơn 0.';
    END IF;

    -- 2. Lấy thông tin ví và KHÓA dòng theo thứ tự ID (Chống Deadlock)
    IF p_from_wallet_id < p_to_wallet_id THEN
        SELECT * INTO v_from_wallet FROM public.wallets WHERE id = p_from_wallet_id AND user_id = v_user_id FOR UPDATE;
        SELECT * INTO v_to_wallet FROM public.wallets WHERE id = p_to_wallet_id AND user_id = v_user_id FOR UPDATE;
    ELSE
        SELECT * INTO v_to_wallet FROM public.wallets WHERE id = p_to_wallet_id AND user_id = v_user_id FOR UPDATE;
        SELECT * INTO v_from_wallet FROM public.wallets WHERE id = p_from_wallet_id AND user_id = v_user_id FOR UPDATE;
    END IF;

    -- 3. Kiểm tra quyền sở hữu và sự tồn tại
    IF v_from_wallet.id IS NULL OR v_to_wallet.id IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy ví hoặc bạn không có quyền truy cập.';
    END IF;

    -- 4. Kiểm tra trạng thái hoạt động
    IF v_from_wallet.is_active = false OR v_to_wallet.is_active = false THEN
        RAISE EXCEPTION 'Một trong hai ví đã bị ẩn hoặc không hoạt động.';
    END IF;

    -- 5. (Đã lược bỏ check wallet_type theo ý Lộc để Client tự xử lý)

    -- 6. Kiểm tra số dư (Chỉ ví thường mới chặn âm)
    IF v_from_wallet.wallet_type != 'credit' AND v_from_wallet.current_balance < p_amount THEN
        RAISE EXCEPTION 'Số dư ví % không đủ.', v_from_wallet.display_name;
    END IF;

    -- 7. Tìm Category phù hợp nhất cho Transfer
    SELECT id INTO v_category_id 
    FROM public.categories 
    WHERE user_id = v_user_id 
    ORDER BY 
        CASE 
            WHEN v_from_wallet.wallet_type = 'credit' AND name ILIKE '%Quẹt hộ%' THEN 1
            WHEN v_to_wallet.wallet_type = 'credit' AND name ILIKE '%Trả nợ%' THEN 2 
            WHEN name ILIKE '%Chuyển tiền%' THEN 3
            ELSE 4 
        END ASC
    LIMIT 1;

    IF v_category_id IS NULL THEN
        RAISE EXCEPTION 'Vui lòng tạo ít nhất một Category trước khi chuyển tiền.';
    END IF;

    -- 8. Ghi nhận giao dịch
    INSERT INTO public.transactions (
        user_id, 
        category_id,
        wallet_id, 
        to_wallet_id, 
        amount, 
        type, 
        note,
        date
    )
    VALUES (
        v_user_id, 
        v_category_id,
        p_from_wallet_id, 
        p_to_wallet_id, 
        p_amount, 
        'transfer', 
        COALESCE(p_note, 'Chuyển khoản: ' || v_from_wallet.display_name || ' -> ' || v_to_wallet.display_name),
        now()
    );

    RETURN true;
END;
$$;


ALTER FUNCTION "public"."transfer_money"("p_from_wallet_id" "uuid", "p_to_wallet_id" "uuid", "p_amount" numeric, "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_modified_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "limit" integer,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "icon" "text",
    "color" "text",
    "deleted_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "device_id" "text" NOT NULL,
    "device_name" "text",
    "fcm_token" "text" NOT NULL,
    "last_seen" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."installment_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "installment_id" "uuid" NOT NULL,
    "transaction_id" "uuid",
    "due_date" timestamp with time zone NOT NULL,
    "amount" numeric NOT NULL,
    "period_number" smallint NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "installment_items_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'BILLED'::"text"])))
);


ALTER TABLE "public"."installment_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."installments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "wallet_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "total_amount" numeric NOT NULL,
    "fee_amount" numeric DEFAULT 0,
    "tenure_months" smallint NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'ACTIVE'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    CONSTRAINT "installments_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'COMPLETED'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."installments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transaction_inbox" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "raw_message" "text" NOT NULL,
    "parsed_amount" numeric,
    "parsed_type" "text",
    "note" "text",
    "transaction_date" timestamp with time zone DEFAULT "now"(),
    "suggested_wallet_id" "uuid",
    "suggested_to_wallet_id" "uuid",
    "suggested_category_id" "uuid",
    "sender_app" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "transaction_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "transaction_inbox_parsed_type_check" CHECK (("parsed_type" = ANY (ARRAY['expense'::"text", 'income'::"text", 'transfer'::"text"]))),
    CONSTRAINT "transaction_inbox_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."transaction_inbox" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "category_id" "uuid",
    "amount" numeric NOT NULL,
    "type" "text" NOT NULL,
    "note" "text",
    "date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    "wallet_id" "uuid",
    "to_wallet_id" "uuid",
    "deleted_at" timestamp with time zone,
    CONSTRAINT "transactions_type_check" CHECK (("type" = ANY (ARRAY['income'::"text", 'expense'::"text", 'transfer'::"text"])))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "display_name" "text" NOT NULL,
    "wallet_type" "text" NOT NULL,
    "initial_balance" numeric DEFAULT 0,
    "current_balance" numeric DEFAULT 0,
    "credit_limit" numeric DEFAULT 0,
    "statement_day" integer,
    "payment_due_day" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."wallets" OWNER TO "postgres";


ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_user_id_device_id_key" UNIQUE ("user_id", "device_id");



ALTER TABLE ONLY "public"."installment_items"
    ADD CONSTRAINT "installment_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."installments"
    ADD CONSTRAINT "installments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transaction_inbox"
    ADD CONSTRAINT "transaction_inbox_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_categories_active" ON "public"."categories" USING "btree" ("user_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_categories_user_id" ON "public"."categories" USING "btree" ("user_id");



CREATE INDEX "idx_inst_items_due_date" ON "public"."installment_items" USING "btree" ("due_date") WHERE ("status" = 'PENDING'::"text");



CREATE INDEX "idx_inst_wallet_id" ON "public"."installments" USING "btree" ("wallet_id");



CREATE INDEX "idx_transaction_inbox_user_status" ON "public"."transaction_inbox" USING "btree" ("user_id", "status");



CREATE INDEX "idx_transactions_active" ON "public"."transactions" USING "btree" ("user_id", "date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_transactions_category_id" ON "public"."transactions" USING "btree" ("category_id");



CREATE INDEX "idx_transactions_created_at" ON "public"."transactions" USING "btree" ("created_at");



CREATE INDEX "idx_transactions_type" ON "public"."transactions" USING "btree" ("type");



CREATE INDEX "idx_transactions_user_id" ON "public"."transactions" USING "btree" ("user_id");



CREATE INDEX "idx_transactions_wallet_id" ON "public"."transactions" USING "btree" ("wallet_id");



CREATE INDEX "idx_wallets_active" ON "public"."wallets" USING "btree" ("user_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_wallets_user_id" ON "public"."wallets" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "set_updated_at_categories" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "set_updated_at_transactions" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "set_updated_at_wallets" BEFORE UPDATE ON "public"."wallets" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "trg_maintain_transaction_balance" AFTER INSERT OR DELETE OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_maintain_wallet_balance"();



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."installment_items"
    ADD CONSTRAINT "installment_items_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "public"."installments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."installment_items"
    ADD CONSTRAINT "installment_items_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."installments"
    ADD CONSTRAINT "installments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."installments"
    ADD CONSTRAINT "installments_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_inbox"
    ADD CONSTRAINT "transaction_inbox_suggested_category_id_fkey" FOREIGN KEY ("suggested_category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transaction_inbox"
    ADD CONSTRAINT "transaction_inbox_suggested_to_wallet_id_fkey" FOREIGN KEY ("suggested_to_wallet_id") REFERENCES "public"."wallets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transaction_inbox"
    ADD CONSTRAINT "transaction_inbox_suggested_wallet_id_fkey" FOREIGN KEY ("suggested_wallet_id") REFERENCES "public"."wallets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transaction_inbox"
    ADD CONSTRAINT "transaction_inbox_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transaction_inbox"
    ADD CONSTRAINT "transaction_inbox_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_to_wallet_id_fkey" FOREIGN KEY ("to_wallet_id") REFERENCES "public"."wallets"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Insert own categories" ON "public"."categories" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Insert own transactions" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Insert own wallets" ON "public"."wallets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Manage own categories" ON "public"."categories" TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Manage own devices" ON "public"."devices" TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Manage own transactions" ON "public"."transactions" TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Manage own wallets" ON "public"."wallets" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Register own devices" ON "public"."devices" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users and service can insert inbox" ON "public"."transaction_inbox" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can delete own inbox" ON "public"."transaction_inbox" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own installment items" ON "public"."installment_items" USING ((EXISTS ( SELECT 1
   FROM "public"."installments"
  WHERE (("installments"."id" = "installment_items"."installment_id") AND ("installments"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their own installments" ON "public"."installments" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own inbox" ON "public"."transaction_inbox" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own inbox" ON "public"."transaction_inbox" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."devices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."installment_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."installments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transaction_inbox" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallets" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."adjust_wallet_balance"("p_wallet_id" "uuid", "p_real_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_wallet_balance"("p_wallet_id" "uuid", "p_real_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_wallet_balance"("p_wallet_id" "uuid", "p_real_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_allowed_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_allowed_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_allowed_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_maintain_wallet_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_maintain_wallet_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_maintain_wallet_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_category_stats"("p_month" integer, "p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_category_stats"("p_month" integer, "p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_category_stats"("p_month" integer, "p_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_finance_overview"("p_target_date" timestamp with time zone, "p_timezone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_finance_overview"("p_target_date" timestamp with time zone, "p_timezone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_finance_overview"("p_target_date" timestamp with time zone, "p_timezone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."pull_data"("last_pulled_at" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."pull_data"("last_pulled_at" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."pull_data"("last_pulled_at" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."push_data"("changes" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."push_data"("changes" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."push_data"("changes" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."transfer_money"("p_from_wallet_id" "uuid", "p_to_wallet_id" "uuid", "p_amount" numeric, "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."transfer_money"("p_from_wallet_id" "uuid", "p_to_wallet_id" "uuid", "p_amount" numeric, "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_money"("p_from_wallet_id" "uuid", "p_to_wallet_id" "uuid", "p_amount" numeric, "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."devices" TO "anon";
GRANT ALL ON TABLE "public"."devices" TO "authenticated";
GRANT ALL ON TABLE "public"."devices" TO "service_role";



GRANT ALL ON TABLE "public"."installment_items" TO "anon";
GRANT ALL ON TABLE "public"."installment_items" TO "authenticated";
GRANT ALL ON TABLE "public"."installment_items" TO "service_role";



GRANT ALL ON TABLE "public"."installments" TO "anon";
GRANT ALL ON TABLE "public"."installments" TO "authenticated";
GRANT ALL ON TABLE "public"."installments" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_inbox" TO "anon";
GRANT ALL ON TABLE "public"."transaction_inbox" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_inbox" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."wallets" TO "anon";
GRANT ALL ON TABLE "public"."wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."wallets" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






