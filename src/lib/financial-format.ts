export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function formatPercentage(value: number | null): string {
  if (value === null) {
    return "-";
  }

  const formattedValue = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2,
  }).format(value);

  return `${formattedValue}%`;
}

export function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
