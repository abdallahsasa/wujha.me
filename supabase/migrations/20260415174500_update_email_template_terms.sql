-- Update custom email template in the database to include {{eventTerms}}
-- This ensures that even users with custom database templates see the event terms.

UPDATE public.email_templates
SET body_html = CASE 
  WHEN body_html LIKE '%{{eventTerms}}%' THEN body_html
  ELSE REPLACE(
    body_html, 
    '</body>', 
    '<div style="margin-top: 20px; padding: 15px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h3 style="font-size: 14px; font-weight: bold; color: #1a1a1a; margin-top: 0; margin-bottom: 8px;">الشروط والأحكام</h3>
      <p style="font-size: 13px; color: #6b7280; line-height: 1.6; margin: 0; white-space: pre-wrap;">{{eventTerms}}</p>
    </div>
    </body>'
  )
END
WHERE template_key = 'ticket-confirmation'
AND body_html IS NOT NULL;
