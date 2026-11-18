import { Panel } from "@/components/ui";
import { formatDate, formatILS } from "@/lib/format";
import { ExpenseForm } from "./expense-form";
import { DeleteExpenseButton } from "./delete-expense-button";

type Finances = {
  id: string;
  purchasePrice: number | null;
  purchaseDate: Date | null;
  purchaseCosts: number | null;
  equity: number | null;
  mortgageMonthly: number | null;
  expenses: { id: string; name: string; amount: number; frequency: "MONTHLY" | "YEARLY" }[];
};

// What the property cost and costs to keep: the inputs for profit and yield
// on the home screen. The purchase figures are edited with the property.
export function PropertyFinances({ property }: { property: Finances }) {
  const investment = property.purchasePrice ? property.purchasePrice + (property.purchaseCosts ?? 0) : null;

  return (
    <section aria-labelledby="finances-title" className="space-y-3">
      <h2 id="finances-title" className="text-lg font-semibold">
        נתונים כספיים
      </h2>
      <Panel className="divide-y divide-line">
        <div className="space-y-1 p-4 text-sm">
          {investment ? (
            <>
              <p>
                <span className="text-muted">השקעה: </span>
                <span className="font-semibold tabular-nums">{formatILS(investment)}</span>
                <span className="text-muted">
                  {" "}
                  (קנייה {formatILS(property.purchasePrice!)}
                  {property.purchaseCosts ? ` + עלויות ${formatILS(property.purchaseCosts)}` : ""}
                  {property.purchaseDate ? `, ${formatDate(property.purchaseDate)}` : ""})
                </span>
              </p>
              {property.equity !== null && (
                <p>
                  <span className="text-muted">הון עצמי: </span>
                  <span className="tabular-nums">{formatILS(property.equity)}</span>
                </p>
              )}
            </>
          ) : (
            <p className="text-muted">עוד לא הוזן מחיר קנייה. מוסיפים אותו בעריכת הנכס (העיפרון למעלה).</p>
          )}
          {property.mortgageMonthly !== null && (
            <p>
              <span className="text-muted">החזר משכנתא: </span>
              <span className="tabular-nums">{formatILS(property.mortgageMonthly)} לחודש</span>
            </p>
          )}
        </div>

        <div className="space-y-3 p-4">
          <h3 className="text-sm font-semibold">הוצאות קבועות</h3>
          {property.expenses.length === 0 ? (
            <p className="text-sm text-muted">למשל ועד בית, ביטוח מבנה או דמי ניהול.</p>
          ) : (
            <ul className="divide-y divide-line">
              {property.expenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-1 text-sm">
                  <span className="min-w-0 truncate">{e.name}</span>
                  <span className="flex shrink-0 items-center gap-1 tabular-nums">
                    {formatILS(e.amount)} {e.frequency === "MONTHLY" ? "לחודש" : "לשנה"}
                    <DeleteExpenseButton expenseId={e.id} name={e.name} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          <ExpenseForm propertyId={property.id} />
        </div>
      </Panel>
    </section>
  );
}
