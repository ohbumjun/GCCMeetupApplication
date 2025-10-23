import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Wallet, Plus, Minus, DollarSign, TrendingDown, AlertCircle, History } from "lucide-react";
import { format } from "date-fns";

interface FinancialAccount {
  id: string;
  userId: string;
  annualFeePaid: boolean;
  annualFeeDate: string | null;
  depositBalance: string;
  lastDepositDate: string | null;
  createdDate: string;
  updatedDate: string;
}

interface FinancialTransaction {
  id: string;
  userId: string;
  accountId: string;
  transactionType: string;
  amount: string;
  balanceAfter: string;
  description: string | null;
  createdDate: string;
}

interface User {
  id: string;
  username: string;
  englishName?: string;
  koreanName?: string;
}

const transactionTypeLabels: Record<string, string> = {
  ANNUAL_FEE: "연회비",
  DEPOSIT: "입금",
  ROOM_FEE: "스터디룸비",
  LATE_FEE: "지각비",
  CANCELLATION_PENALTY: "취소 패널티",
  PRESENTER_PENALTY: "발제자 패널티",
  REFUND: "환불",
  ADJUSTMENT: "조정",
};

const transactionTypeColors: Record<string, string> = {
  DEPOSIT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  ROOM_FEE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  LATE_FEE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  CANCELLATION_PENALTY: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  PRESENTER_PENALTY: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  ANNUAL_FEE: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  REFUND: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  ADJUSTMENT: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function FinancialPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "ADMIN";
  
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [isDeductDialogOpen, setIsDeductDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionType, setTransactionType] = useState("ROOM_FEE");

  // Fetch all accounts (admin only)
  const { data: allAccounts, isLoading: accountsLoading } = useQuery<FinancialAccount[]>({
    queryKey: ["/api/financial/accounts"],
    enabled: isAdmin,
  });

  // Fetch all users (admin only)
  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  // Fetch current user's account
  const { data: myAccount, isLoading: myAccountLoading } = useQuery<FinancialAccount>({
    queryKey: ["/api/financial/account", user?.id],
    enabled: !isAdmin && !!user?.id,
  });

  // Fetch current user's transactions
  const { data: myTransactions, isLoading: myTransactionsLoading } = useQuery<FinancialTransaction[]>({
    queryKey: ["/api/financial/transactions", user?.id],
    enabled: !isAdmin && !!user?.id,
  });

  // Deposit mutation
  const depositMutation = useMutation({
    mutationFn: (data: { userId: string; amount: string; description: string }) =>
      apiRequest("POST", "/api/financial/deposit", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/transactions"] });
      setIsDepositDialogOpen(false);
      setAmount("");
      setDescription("");
      setSelectedUserId("");
      toast({
        title: "성공",
        description: "입금이 완료되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "입금에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Deduct mutation
  const deductMutation = useMutation({
    mutationFn: (data: { userId: string; amount: string; transactionType: string; description: string }) =>
      apiRequest("POST", "/api/financial/deduct", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/transactions"] });
      setIsDeductDialogOpen(false);
      setAmount("");
      setDescription("");
      setSelectedUserId("");
      toast({
        title: "성공",
        description: "차감이 완료되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "차감에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleDeposit = () => {
    if (!selectedUserId || !amount) {
      toast({
        title: "오류",
        description: "모든 필드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    depositMutation.mutate({
      userId: selectedUserId,
      amount,
      description: description || "Deposit",
    });
  };

  const handleDeduct = () => {
    if (!selectedUserId || !amount) {
      toast({
        title: "오류",
        description: "모든 필드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    deductMutation.mutate({
      userId: selectedUserId,
      amount,
      transactionType,
      description: description || "Deduction",
    });
  };

  const lowBalanceAccounts = allAccounts?.filter(
    (account) => parseFloat(account.depositBalance) <= 15000
  ) || [];

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header title="재무 관리" subtitle="회원 재무 현황 및 거래 관리" />
        
        <div className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
          {/* Admin View */}
          {isAdmin && (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card data-testid="card-total-balance">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">전체 잔액</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {accountsLoading ? (
                      <Skeleton className="h-7 w-24" />
                    ) : (
                      <div className="text-2xl font-bold" data-testid="text-total-balance">
                        ₩{allAccounts?.reduce((sum, acc) => sum + parseFloat(acc.depositBalance || "0"), 0).toLocaleString()}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">총 보증금</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-low-balance">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">잔액 부족</CardTitle>
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    {accountsLoading ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <div className="text-2xl font-bold text-orange-500" data-testid="text-low-balance-count">
                        {lowBalanceAccounts.length}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">15,000원 이하</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-avg-balance">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">평균 잔액</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {accountsLoading ? (
                      <Skeleton className="h-7 w-24" />
                    ) : (
                      <div className="text-2xl font-bold" data-testid="text-avg-balance">
                        ₩{allAccounts && allAccounts.length > 0
                          ? Math.round(allAccounts.reduce((sum, acc) => sum + parseFloat(acc.depositBalance || "0"), 0) / allAccounts.length).toLocaleString()
                          : "0"}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">회원 평균</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-annual-fee-paid">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">연회비 납부</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {accountsLoading ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <div className="text-2xl font-bold" data-testid="text-annual-fee-paid">
                        {allAccounts?.filter((acc) => acc.annualFeePaid).length || 0}/{allAccounts?.length || 0}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">납부 완료</p>
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-open-deposit">
                      <Plus className="h-4 w-4 mr-2" />
                      입금 처리
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>입금 처리</DialogTitle>
                      <DialogDescription>회원의 보증금을 입금 처리합니다.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="deposit-user">회원 선택</Label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                          <SelectTrigger id="deposit-user" data-testid="select-deposit-user">
                            <SelectValue placeholder="회원을 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {allUsers?.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.koreanName || u.englishName || u.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="deposit-amount">금액 (원)</Label>
                        <Input
                          id="deposit-amount"
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="50000"
                          data-testid="input-deposit-amount"
                        />
                      </div>
                      <div>
                        <Label htmlFor="deposit-description">설명</Label>
                        <Textarea
                          id="deposit-description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="입금 사유를 입력하세요"
                          data-testid="input-deposit-description"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleDeposit}
                        disabled={depositMutation.isPending}
                        data-testid="button-confirm-deposit"
                      >
                        입금 완료
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isDeductDialogOpen} onOpenChange={setIsDeductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" data-testid="button-open-deduct">
                      <Minus className="h-4 w-4 mr-2" />
                      차감 처리
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>차감 처리</DialogTitle>
                      <DialogDescription>회원의 보증금을 차감 처리합니다.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="deduct-user">회원 선택</Label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                          <SelectTrigger id="deduct-user" data-testid="select-deduct-user">
                            <SelectValue placeholder="회원을 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {allUsers?.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.koreanName || u.englishName || u.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="deduct-type">차감 유형</Label>
                        <Select value={transactionType} onValueChange={setTransactionType}>
                          <SelectTrigger id="deduct-type" data-testid="select-deduct-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ROOM_FEE">스터디룸비</SelectItem>
                            <SelectItem value="LATE_FEE">지각비</SelectItem>
                            <SelectItem value="CANCELLATION_PENALTY">취소 패널티</SelectItem>
                            <SelectItem value="PRESENTER_PENALTY">발제자 패널티</SelectItem>
                            <SelectItem value="ADJUSTMENT">조정</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="deduct-amount">금액 (원)</Label>
                        <Input
                          id="deduct-amount"
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="5000"
                          data-testid="input-deduct-amount"
                        />
                      </div>
                      <div>
                        <Label htmlFor="deduct-description">설명</Label>
                        <Textarea
                          id="deduct-description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="차감 사유를 입력하세요"
                          data-testid="input-deduct-description"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleDeduct}
                        variant="destructive"
                        disabled={deductMutation.isPending}
                        data-testid="button-confirm-deduct"
                      >
                        차감 완료
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* All Accounts Table */}
              <Card data-testid="card-accounts-table">
                <CardHeader>
                  <CardTitle>회원별 재무 현황</CardTitle>
                </CardHeader>
                <CardContent>
                  {accountsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : allAccounts && allAccounts.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>회원명</TableHead>
                            <TableHead>연회비</TableHead>
                            <TableHead className="text-right">보증금 잔액</TableHead>
                            <TableHead>상태</TableHead>
                            <TableHead className="text-right">마지막 입금일</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allAccounts.map((account) => {
                            const accountUser = allUsers?.find((u) => u.id === account.userId);
                            const balance = parseFloat(account.depositBalance || "0");
                            const isLow = balance <= 15000;
                            
                            return (
                              <TableRow key={account.id} data-testid={`row-account-${account.userId}`}>
                                <TableCell className="font-medium" data-testid={`name-${account.userId}`}>
                                  {accountUser?.koreanName || accountUser?.englishName || accountUser?.username || "Unknown"}
                                </TableCell>
                                <TableCell>
                                  {account.annualFeePaid ? (
                                    <Badge className="bg-green-500 hover:bg-green-600" data-testid={`annual-fee-paid-${account.userId}`}>
                                      납부완료
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" data-testid={`annual-fee-unpaid-${account.userId}`}>
                                      미납
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-semibold" data-testid={`balance-${account.userId}`}>
                                  ₩{balance.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  {isLow ? (
                                    <Badge variant="destructive" data-testid={`status-low-${account.userId}`}>
                                      잔액 부족
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" data-testid={`status-ok-${account.userId}`}>
                                      정상
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground" data-testid={`last-deposit-${account.userId}`}>
                                  {account.lastDepositDate
                                    ? format(new Date(account.lastDepositDate), "yyyy-MM-dd")
                                    : "-"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">아직 재무 계정이 없습니다.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* User View */}
          {!isAdmin && (
            <>
              {/* My Balance Card */}
              <Card data-testid="card-my-balance">
                <CardHeader>
                  <CardTitle>내 잔액 정보</CardTitle>
                </CardHeader>
                <CardContent>
                  {myAccountLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : myAccount ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">현재 보증금</p>
                          <p className="text-3xl font-bold" data-testid="text-my-balance">
                            ₩{parseFloat(myAccount.depositBalance || "0").toLocaleString()}
                          </p>
                        </div>
                        <Wallet className="h-12 w-12 text-primary" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">연회비</p>
                          <p className="font-medium" data-testid="text-my-annual-fee">
                            {myAccount.annualFeePaid ? (
                              <Badge className="bg-green-500">납부완료</Badge>
                            ) : (
                              <Badge variant="outline">미납</Badge>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">마지막 입금일</p>
                          <p className="font-medium" data-testid="text-my-last-deposit">
                            {myAccount.lastDepositDate
                              ? format(new Date(myAccount.lastDepositDate), "yyyy-MM-dd")
                              : "-"}
                          </p>
                        </div>
                      </div>
                      {parseFloat(myAccount.depositBalance || "0") <= 15000 && (
                        <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                          <AlertCircle className="h-5 w-5 text-orange-500" />
                          <p className="text-sm text-orange-700 dark:text-orange-300">
                            잔액이 15,000원 이하입니다. 보증금을 충전해주세요.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">재무 계정 정보를 불러올 수 없습니다.</p>
                  )}
                </CardContent>
              </Card>

              {/* My Transactions */}
              <Card data-testid="card-my-transactions">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    거래 내역
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {myTransactionsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : myTransactions && myTransactions.length > 0 ? (
                    <div className="space-y-2">
                      {myTransactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                          data-testid={`transaction-${transaction.id}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={transactionTypeColors[transaction.transactionType]}>
                                {transactionTypeLabels[transaction.transactionType] || transaction.transactionType}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(transaction.createdDate), "yyyy-MM-dd HH:mm")}
                              </span>
                            </div>
                            {transaction.description && (
                              <p className="text-sm text-muted-foreground">{transaction.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-lg font-semibold ${
                                parseFloat(transaction.amount) > 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {parseFloat(transaction.amount) > 0 ? "+" : ""}
                              ₩{Math.abs(parseFloat(transaction.amount)).toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              잔액: ₩{parseFloat(transaction.balanceAfter).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">아직 거래 내역이 없습니다.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
