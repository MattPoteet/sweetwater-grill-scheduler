import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogOut,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { hasSupabaseConfig, supabase, supabaseConfigError } from './lib/supabase';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SESSION_KEY = 'sweetwater-auth-user';
const emptyData = {
  employees: [],
  shifts: [],
  timeOffRequests: [],
  coverageRequests: [],
  notifications: [],
};
const emptyShift = { employee_id: '', date: '', start_time: '16:00', end_time: '22:00', station: 'Dining Room', notes: '' };

function App() {
  const [data, setData] = useState(emptyData);
  const [loadStatus, setLoadStatus] = useState(hasSupabaseConfig ? 'loading' : 'missing-config');
  const [loadError, setLoadError] = useState('');
  const [currentUserId, setCurrentUserId] = useState(() => sessionStorage.getItem(SESSION_KEY) || '');
  const [loginDraft, setLoginDraft] = useState({ email: '', credential: '' });
  const [loginError, setLoginError] = useState('');
  const [pendingPasswordUser, setPendingPasswordUser] = useState(null);
  const [passwordDraft, setPasswordDraft] = useState({ password: '', confirm: '' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [weekOffset, setWeekOffset] = useState(1);
  const [shiftDraft, setShiftDraft] = useState(emptyShift);
  const [editingShiftId, setEditingShiftId] = useState(null);
  const [employeeDraft, setEmployeeDraft] = useState({ name: '', email: '', position: 'Server', role: 'employee', login_code: '' });
  const [timeOffDraft, setTimeOffDraft] = useState({ start_date: '', end_date: '', reason: '' });
  const [coverageDraft, setCoverageDraft] = useState({ shift_id: '', target_employee_id: 'all' });

  const currentUser = data.employees.find((employee) => employee.id === currentUserId);
  const isManager = currentUser?.role === 'manager';
  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const visibleShifts = data.shifts
    .filter((shift) => weekDays.some((day) => day.iso === shift.date))
    .sort(sortShifts);
  const myShifts = visibleShifts.filter((shift) => shift.employee_id === currentUser?.id);
  const unreadCount = data.notifications.filter((note) => note.employee_id === currentUser?.id && !note.read).length;

  useEffect(() => {
    if (!hasSupabaseConfig) {
      return;
    }

    let isMounted = true;
    loadFromSupabase()
      .then((nextData) => {
        if (!isMounted) return;
        setData(nextData);
        setLoadStatus('ready');
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Supabase data load failed.', error);
        setLoadError(error.message || 'Unable to load Supabase data.');
        setLoadStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const addNotification = async (employeeId, title, body) => {
    const notification = {
      employee_id: employeeId,
      title,
      body,
      read: false,
      created_at: new Date().toISOString(),
    };
    const { data: savedNotification, error } = await supabase.from('notifications').insert(notification).select('*').single();
    if (error) throw error;
    setData((current) => ({
      ...current,
      notifications: [savedNotification, ...current.notifications],
    }));
  };

  const saveEmployee = async (event) => {
    event.preventDefault();
    const loginCode = employeeDraft.login_code.trim();
    if (!loginCode) {
      showActionError(new Error('Create a one-time passcode before adding the employee.'));
      return;
    }

    const email = employeeDraft.email.trim() || buildEmployeeLoginEmail(employeeDraft.name, data.employees);
    const { data: employee, error } = await supabase
      .from('employees')
      .insert({
        active: true,
        name: employeeDraft.name.trim(),
        email,
        position: employeeDraft.position.trim(),
        role: employeeDraft.role,
        login_code: loginCode,
        must_change_password: true,
        password_hash: null,
        password_salt: null,
      })
      .select('*')
      .single();
    if (error) return showActionError(error);
    setData((current) => ({ ...current, employees: [...current.employees, employee] }));
    setEmployeeDraft({ name: '', email: '', position: 'Server', role: 'employee', login_code: '' });
    window.alert(`${employee.name} was added. Give them this one-time passcode: ${loginCode}`);
  };

  const removeEmployee = async (id) => {
    const { error } = await supabase.from('employees').update({ active: false }).eq('id', id);
    if (error) return showActionError(error);
    setData((current) => ({
      ...current,
      employees: current.employees.map((employee) => (employee.id === id ? { ...employee, active: false } : employee)),
    }));
  };

  const resetEmployeeCode = async (employee) => {
    const loginCode = window.prompt(`Enter a new one-time passcode for ${employee.name}:`)?.trim();
    if (!loginCode) {
      return;
    }

    const { data: updatedEmployee, error } = await supabase
      .from('employees')
      .update({
        login_code: loginCode,
        must_change_password: true,
        password_hash: null,
        password_salt: null,
      })
      .eq('id', employee.id)
      .select('*')
      .single();
    if (error) return showActionError(error);
    setData((current) => ({
      ...current,
      employees: current.employees.map((item) => (item.id === employee.id ? updatedEmployee : item)),
    }));
    window.alert(`${updatedEmployee.name}'s one-time passcode is now: ${loginCode}`);
  };

  const saveShift = async (event) => {
    event.preventDefault();
    if (editingShiftId) {
      const { data: updatedShift, error } = await supabase.from('shifts').update(shiftDraft).eq('id', editingShiftId).select('*').single();
      if (error) return showActionError(error);
      setData((current) => ({
        ...current,
        shifts: current.shifts.map((shift) => (shift.id === editingShiftId ? updatedShift : shift)),
      }));
      setEditingShiftId(null);
    } else {
      const { data: newShift, error } = await supabase.from('shifts').insert(shiftDraft).select('*').single();
      if (error) return showActionError(error);
      setData((current) => ({
        ...current,
        shifts: [...current.shifts, newShift],
      }));
    }
    setShiftDraft(emptyShift);
  };

  const editShift = (shift) => {
    setEditingShiftId(shift.id);
    setShiftDraft({
      employee_id: shift.employee_id,
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      station: shift.station,
      notes: shift.notes,
    });
    setActiveTab('schedule');
  };

  const deleteShift = async (id) => {
    const { error } = await supabase.from('shifts').delete().eq('id', id);
    if (error) return showActionError(error);
    setData((current) => ({
      ...current,
      shifts: current.shifts.filter((shift) => shift.id !== id),
      coverageRequests: current.coverageRequests.filter((request) => request.shift_id !== id),
    }));
  };

  const submitTimeOff = async (event) => {
    event.preventDefault();
    const { data: request, error } = await supabase
      .from('time_off_requests')
      .insert({ employee_id: currentUser.id, status: 'Pending', manager_note: '', ...timeOffDraft })
      .select('*')
      .single();
    if (error) return showActionError(error);
    setData((current) => ({ ...current, timeOffRequests: [request, ...current.timeOffRequests] }));
    await notifyManagers('Time-off request pending', `${currentUser.name} requested ${formatDate(request.start_date)} off.`);
    setTimeOffDraft({ start_date: '', end_date: '', reason: '' });
  };

  const submitCoverage = async (event) => {
    event.preventDefault();
    const shift = data.shifts.find((item) => item.id === coverageDraft.shift_id);
    if (!shift) return showActionError(new Error('Select a shift before requesting coverage.'));
    const targetId = coverageDraft.target_employee_id === 'all' ? null : coverageDraft.target_employee_id;
    const { data: request, error } = await supabase.from('coverage_requests').insert({
      shift_id: coverageDraft.shift_id,
      requester_id: currentUser.id,
      target_employee_id: targetId,
      accepted_by_id: null,
      status: 'Pending',
      manager_note: '',
    }).select('*').single();
    if (error) return showActionError(error);
    setData((current) => ({ ...current, coverageRequests: [request, ...current.coverageRequests] }));
    const recipients = targetId ? [targetId] : data.employees.filter((employee) => employee.role === 'employee' && employee.id !== currentUser.id).map((employee) => employee.id);
    await Promise.all(recipients.map((id) => addNotification(id, 'Coverage requested', `${currentUser.name} needs coverage for ${formatDate(shift.date)} ${shift.start_time}.`)));
    await notifyManagers('Coverage request started', `${currentUser.name} requested shift coverage.`);
    setCoverageDraft({ shift_id: '', target_employee_id: 'all' });
  };

  const acceptCoverage = async (requestId) => {
    const { data: updatedRequest, error } = await supabase.from('coverage_requests').update({ accepted_by_id: currentUser.id }).eq('id', requestId).select('*').single();
    if (error) return showActionError(error);
    setData((current) => ({
      ...current,
      coverageRequests: current.coverageRequests.map((request) => (request.id === requestId ? updatedRequest : request)),
    }));
    await notifyManagers('Coverage accepted', `${currentUser.name} accepted a coverage request. Approval is needed.`);
  };

  const decideTimeOff = async (requestId, status) => {
    const request = data.timeOffRequests.find((item) => item.id === requestId);
    const { data: updatedRequest, error } = await supabase.from('time_off_requests').update({ status }).eq('id', requestId).select('*').single();
    if (error) return showActionError(error);
    setData((current) => ({
      ...current,
      timeOffRequests: current.timeOffRequests.map((item) => (item.id === requestId ? updatedRequest : item)),
    }));
    await addNotification(request.employee_id, `Time off ${status.toLowerCase()}`, `Your request for ${formatDate(request.start_date)} is ${status.toLowerCase()}.`);
  };

  const decideCoverage = async (requestId, status) => {
    const request = data.coverageRequests.find((item) => item.id === requestId);
    const shift = data.shifts.find((item) => item.id === request.shift_id);
    const { data: updatedRequest, error } = await supabase.from('coverage_requests').update({ status }).eq('id', requestId).select('*').single();
    if (error) return showActionError(error);
    let updatedShift = shift;
    if (status === 'Approved' && request.accepted_by_id) {
      const shiftResult = await supabase.from('shifts').update({ employee_id: request.accepted_by_id }).eq('id', request.shift_id).select('*').single();
      if (shiftResult.error) return showActionError(shiftResult.error);
      updatedShift = shiftResult.data;
    }
    setData((current) => ({
      ...current,
      shifts: status === 'Approved' && request.accepted_by_id
        ? current.shifts.map((item) => (item.id === request.shift_id ? updatedShift : item))
        : current.shifts,
      coverageRequests: current.coverageRequests.map((item) => (item.id === requestId ? updatedRequest : item)),
    }));
    await addNotification(request.requester_id, `Coverage ${status.toLowerCase()}`, `${formatDate(shift.date)} coverage was ${status.toLowerCase()}.`);
    if (request.accepted_by_id) {
      await addNotification(request.accepted_by_id, `Coverage ${status.toLowerCase()}`, `${formatDate(shift.date)} coverage was ${status.toLowerCase()}.`);
    }
  };

  const notifyManagers = async (title, body) => {
    await Promise.all(data.employees.filter((employee) => employee.role === 'manager').map((manager) => addNotification(manager.id, title, body)));
  };

  const markNotificationsRead = async () => {
    const unreadIds = data.notifications.filter((note) => note.employee_id === currentUser.id && !note.read).map((note) => note.id);
    if (unreadIds.length > 0) {
      const { error } = await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
      if (error) return showActionError(error);
    }
    setData((current) => ({
      ...current,
      notifications: current.notifications.map((note) => (note.employee_id === currentUser.id ? { ...note, read: true } : note)),
    }));
  };

  const finishLogin = (employee) => {
    setCurrentUserId(employee.id);
    sessionStorage.setItem(SESSION_KEY, employee.id);
    setActiveTab(employee.role === 'manager' ? 'dashboard' : 'mySchedule');
    setLoginDraft({ email: '', credential: '' });
    setLoginError('');
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError('');
    const loginName = loginDraft.email.trim().toLowerCase();
    const employee = data.employees.find((item) => {
      const employeeName = item.name.toLowerCase();
      const employeeEmail = item.email.toLowerCase();
      return item.active && (employeeName === loginName || employeeEmail === loginName);
    });

    if (!employee) {
      setLoginError('No active employee was found for that name.');
      return;
    }

    if (employee.must_change_password !== false) {
      if (!employee.login_code) {
        setLoginError('This employee does not have a temporary login code. Ask a manager to create one.');
        return;
      }

      if (loginDraft.credential.trim() !== employee.login_code) {
        setLoginError('That temporary code is not correct.');
        return;
      }

      setPendingPasswordUser(employee);
      setPasswordDraft({ password: '', confirm: '' });
      return;
    }

    if (!employee.password_hash || !employee.password_salt) {
      setLoginError('This account needs a new temporary code from a manager.');
      return;
    }

    const hash = await hashPassword(loginDraft.credential, employee.password_salt);
    if (hash !== employee.password_hash) {
      setLoginError('That password is not correct.');
      return;
    }

    await supabase.from('employees').update({ last_login_at: new Date().toISOString() }).eq('id', employee.id);
    finishLogin(employee);
  };

  const handlePasswordSetup = async (event) => {
    event.preventDefault();
    setLoginError('');

    if (passwordDraft.password.length < 8) {
      setLoginError('Use at least 8 characters for the new password.');
      return;
    }

    if (passwordDraft.password !== passwordDraft.confirm) {
      setLoginError('The passwords do not match.');
      return;
    }

    const salt = generateLoginCode();
    const passwordHash = await hashPassword(passwordDraft.password, salt);
    const { data: updatedEmployee, error } = await supabase
      .from('employees')
      .update({
        password_hash: passwordHash,
        password_salt: salt,
        login_code: null,
        must_change_password: false,
        last_login_at: new Date().toISOString(),
      })
      .eq('id', pendingPasswordUser.id)
      .select('*')
      .single();

    if (error) {
      setLoginError(error.message);
      return;
    }

    setData((current) => ({
      ...current,
      employees: current.employees.map((employee) => (employee.id === updatedEmployee.id ? updatedEmployee : employee)),
    }));
    setPendingPasswordUser(null);
    finishLogin(updatedEmployee);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setCurrentUserId('');
    setActiveTab('dashboard');
  };

  if (loadStatus === 'missing-config') {
    return <SetupState title="Supabase setup required" message={supabaseConfigError || 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart npm run dev.'} />;
  }

  if (loadStatus === 'loading') {
    return <SetupState title="Loading Sweetwater Grill Scheduler" message="Connecting to Supabase..." />;
  }

  if (loadStatus === 'error') {
    return <SetupState title="Supabase connection error" message={loadError} />;
  }

  if (data.employees.length === 0) {
    return <SetupState title="No employees found" message="Supabase is connected, but the employees table is empty. Add your manager record in Supabase to start scheduling." />;
  }

  if (pendingPasswordUser) {
    return (
      <PasswordSetupScreen
        employee={pendingPasswordUser}
        passwordDraft={passwordDraft}
        setPasswordDraft={setPasswordDraft}
        error={loginError}
        onSubmit={handlePasswordSetup}
      />
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        employees={data.employees}
        loginDraft={loginDraft}
        setLoginDraft={setLoginDraft}
        error={loginError}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-charcoal text-cream shadow-soft">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <img
            className="h-12 w-12 rounded-full bg-cream object-contain"
            src="/logo.png"
            alt="Sweetwater Grill"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">{currentUser?.name}</p>
            <p className="text-xs text-cream/70">{currentUser?.position}</p>
          </div>
          <button className="relative rounded-full bg-ink p-2 text-cream" onClick={() => setActiveTab('notifications')} aria-label="Notifications">
            <Bell size={20} />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-gold px-1.5 text-xs font-bold text-charcoal">{unreadCount}</span>}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-4">
        <HomeIntro />

        {activeTab === 'dashboard' && isManager && (
          <ManagerDashboard data={data} visibleShifts={visibleShifts} weekDays={weekDays} onApproveTimeOff={decideTimeOff} onApproveCoverage={decideCoverage} />
        )}
        {activeTab === 'employees' && isManager && (
          <EmployeesPanel employees={data.employees} employeeDraft={employeeDraft} setEmployeeDraft={setEmployeeDraft} onSave={saveEmployee} onRemove={removeEmployee} onResetCode={resetEmployeeCode} />
        )}
        {activeTab === 'schedule' && isManager && (
          <ScheduleBuilder
            employees={data.employees}
            shifts={visibleShifts}
            weekDays={weekDays}
            weekOffset={weekOffset}
            setWeekOffset={setWeekOffset}
            shiftDraft={shiftDraft}
            setShiftDraft={setShiftDraft}
            editingShiftId={editingShiftId}
            onSave={saveShift}
            onEdit={editShift}
            onDelete={deleteShift}
          />
        )}
        {activeTab === 'mySchedule' && (
          <EmployeeSchedule
            currentUser={currentUser}
            employees={data.employees}
            shifts={visibleShifts}
            myShifts={myShifts}
            weekDays={weekDays}
            weekOffset={weekOffset}
            setWeekOffset={setWeekOffset}
            coverageDraft={coverageDraft}
            setCoverageDraft={setCoverageDraft}
            onCoverageSubmit={submitCoverage}
          />
        )}
        {activeTab === 'teamSchedule' && <TeamSchedule employees={data.employees} shifts={visibleShifts} weekDays={weekDays} />}
        {activeTab === 'requests' && (
          <RequestsPanel
            currentUser={currentUser}
            employees={data.employees}
            shifts={data.shifts}
            timeOffRequests={data.timeOffRequests}
            coverageRequests={data.coverageRequests}
            timeOffDraft={timeOffDraft}
            setTimeOffDraft={setTimeOffDraft}
            onTimeOffSubmit={submitTimeOff}
            onAcceptCoverage={acceptCoverage}
          />
        )}
        {activeTab === 'notifications' && (
          <NotificationsPanel notifications={data.notifications.filter((note) => note.employee_id === currentUser.id)} onRead={markNotificationsRead} />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-charcoal/10 bg-paper/95 px-2 py-2 shadow-soft backdrop-blur safe-bottom">
        <div className="mx-auto grid max-w-5xl grid-cols-5 gap-1">
          {isManager ? (
            <>
              <NavButton icon={ShieldCheck} label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
              <NavButton icon={UsersRound} label="Staff" active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} />
              <NavButton icon={CalendarDays} label="Build" active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} />
            </>
          ) : (
            <>
              <NavButton icon={UserRound} label="Mine" active={activeTab === 'mySchedule'} onClick={() => setActiveTab('mySchedule')} />
              <NavButton icon={UsersRound} label="Team" active={activeTab === 'teamSchedule'} onClick={() => setActiveTab('teamSchedule')} />
              <NavButton icon={Send} label="Ask" active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} />
            </>
          )}
          <NavButton icon={Bell} label="Alerts" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} />
          <NavButton icon={LogOut} label="Logout" active={false} onClick={handleLogout} />
        </div>
      </nav>
    </div>
  );
}

function HomeIntro() {
  return (
    <section className="mb-4 rounded-lg bg-charcoal p-4 text-cream shadow-soft">
      <div className="flex items-center gap-3">
        <img
          className="h-16 w-28 rounded-md bg-cream object-contain p-1"
          src="/logo.png"
          alt="Sweetwater Grill logo"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
        <div className="min-w-0">
          <h1 className="text-2xl font-black leading-tight">Sweetwater Grill Scheduler</h1>
          <p className="text-sm font-semibold text-cream/75">Restaurant Employee Scheduling</p>
        </div>
      </div>
      <p className="mt-3 rounded-md bg-green/20 px-3 py-2 text-sm text-cream">Connected to Supabase</p>
    </section>
  );
}

function AuthScreen({ loginDraft, setLoginDraft, error, onSubmit }) {
  return (
    <main className="min-h-screen bg-cream px-4 py-8 text-charcoal">
      <section className="mx-auto max-w-md rounded-lg bg-paper p-5 shadow-soft">
        <img
          className="mb-4 h-20 w-20 rounded-full object-contain"
          src="/logo.png"
          alt="Sweetwater Grill"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
        <h1 className="text-2xl font-black">Sweetwater Grill Scheduler</h1>
        <p className="mt-1 font-semibold text-charcoal/70">Restaurant Employee Scheduling</p>
        <form className="mt-5 grid gap-3" onSubmit={onSubmit}>
          <label className="grid gap-1 text-sm font-bold">
            Name
            <input
              className="rounded-md border border-charcoal/15 bg-white px-3 py-3 text-base font-normal"
              type="text"
              value={loginDraft.email}
              onChange={(event) => setLoginDraft({ ...loginDraft, email: event.target.value })}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Password or one-time passcode
            <input
              className="rounded-md border border-charcoal/15 bg-white px-3 py-3 text-base font-normal"
              type="password"
              value={loginDraft.credential}
              onChange={(event) => setLoginDraft({ ...loginDraft, credential: event.target.value })}
              required
            />
          </label>
          {error && <p className="rounded-md bg-orange/15 p-3 text-sm font-semibold text-orange">{error}</p>}
          <button className="rounded-md bg-teal px-4 py-3 font-bold text-white">Login</button>
        </form>
        <p className="mt-4 rounded-md bg-gold/20 p-3 text-sm text-charcoal/70">
          First time here? Enter your name and the one-time passcode your manager gave you. You will create your own password before entering the scheduler.
        </p>
      </section>
    </main>
  );
}

function PasswordSetupScreen({ employee, passwordDraft, setPasswordDraft, error, onSubmit }) {
  return (
    <main className="min-h-screen bg-cream px-4 py-8 text-charcoal">
      <section className="mx-auto max-w-md rounded-lg bg-paper p-5 shadow-soft">
        <img
          className="mb-4 h-20 w-20 rounded-full object-contain"
          src="/logo.png"
          alt="Sweetwater Grill"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
        <h1 className="text-2xl font-black">Create your password</h1>
        <p className="mt-1 font-semibold text-charcoal/70">{employee.name}</p>
        <form className="mt-5 grid gap-3" onSubmit={onSubmit}>
          <label className="grid gap-1 text-sm font-bold">
            New password
            <input
              className="rounded-md border border-charcoal/15 bg-white px-3 py-3 text-base font-normal"
              type="password"
              minLength={8}
              value={passwordDraft.password}
              onChange={(event) => setPasswordDraft({ ...passwordDraft, password: event.target.value })}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Confirm password
            <input
              className="rounded-md border border-charcoal/15 bg-white px-3 py-3 text-base font-normal"
              type="password"
              minLength={8}
              value={passwordDraft.confirm}
              onChange={(event) => setPasswordDraft({ ...passwordDraft, confirm: event.target.value })}
              required
            />
          </label>
          {error && <p className="rounded-md bg-orange/15 p-3 text-sm font-semibold text-orange">{error}</p>}
          <button className="rounded-md bg-green px-4 py-3 font-bold text-white">Save password</button>
        </form>
      </section>
    </main>
  );
}

function SetupState({ title, message }) {
  return (
    <main className="min-h-screen bg-cream px-4 py-8 text-charcoal">
      <section className="mx-auto max-w-md rounded-lg bg-paper p-5 shadow-soft">
        <img
          className="mb-4 h-20 w-20 rounded-full object-contain"
          src="/logo.png"
          alt="Sweetwater Grill"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
        <h1 className="text-2xl font-black">Sweetwater Grill Scheduler</h1>
        <p className="mt-1 font-semibold text-charcoal/70">Restaurant Employee Scheduling</p>
        <div className="mt-4 rounded-md bg-gold/20 p-3">
          <p className="font-bold">{title}</p>
          <p className="mt-1 text-sm text-charcoal/70">{message}</p>
        </div>
      </section>
    </main>
  );
}

function ManagerDashboard({ data, visibleShifts, weekDays, onApproveTimeOff, onApproveCoverage }) {
  const pendingTimeOff = data.timeOffRequests.filter((request) => request.status === 'Pending');
  const pendingCoverage = data.coverageRequests.filter((request) => request.status === 'Pending');
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Active staff" value={data.employees.filter((employee) => employee.active).length} />
        <Metric label="This week" value={visibleShifts.length} />
        <Metric label="Time off" value={pendingTimeOff.length} />
        <Metric label="Coverage" value={pendingCoverage.length} />
      </div>
      <ApprovalScreen
        employees={data.employees}
        shifts={data.shifts}
        timeOffRequests={pendingTimeOff}
        coverageRequests={pendingCoverage}
        onApproveTimeOff={onApproveTimeOff}
        onApproveCoverage={onApproveCoverage}
      />
      <SectionTitle icon={CalendarDays} title="Week at a glance" />
      <ScheduleList employees={data.employees} shifts={visibleShifts.slice(0, 6)} weekDays={weekDays} />
    </div>
  );
}

function ApprovalScreen({ employees, shifts, timeOffRequests, coverageRequests, onApproveTimeOff, onApproveCoverage }) {
  return (
    <section className="rounded-lg bg-charcoal p-4 text-cream shadow-soft">
      <SectionTitle icon={ShieldCheck} title="Manager approvals" light />
      <div className="space-y-3">
        {timeOffRequests.map((request) => (
          <ApprovalItem key={request.id} title={`${nameFor(employees, request.employee_id)} wants time off`} detail={`${formatDate(request.start_date)} to ${formatDate(request.end_date)} - ${request.reason}`} onApprove={() => onApproveTimeOff(request.id, 'Approved')} onDeny={() => onApproveTimeOff(request.id, 'Denied')} />
        ))}
        {coverageRequests.map((request) => {
          const shift = shifts.find((item) => item.id === request.shift_id);
          return (
            <ApprovalItem
              key={request.id}
              title={`${nameFor(employees, request.requester_id)} requested coverage`}
              detail={`${shift ? `${formatDate(shift.date)} ${shift.start_time}-${shift.end_time}` : 'Shift'} accepted by ${request.accepted_by_id ? nameFor(employees, request.accepted_by_id) : 'no one yet'}`}
              disabled={!request.accepted_by_id}
              onApprove={() => onApproveCoverage(request.id, 'Approved')}
              onDeny={() => onApproveCoverage(request.id, 'Denied')}
            />
          );
        })}
        {timeOffRequests.length === 0 && coverageRequests.length === 0 && <p className="rounded-md bg-white/10 p-3 text-sm text-cream/75">No pending approvals.</p>}
      </div>
    </section>
  );
}

function EmployeesPanel({ employees, employeeDraft, setEmployeeDraft, onSave, onRemove, onResetCode }) {
  return (
    <div className="space-y-4">
      <SectionTitle icon={UsersRound} title="Employee list" />
      <form className="grid gap-2 rounded-lg bg-paper p-3 shadow-soft" onSubmit={onSave}>
        <input className="rounded-md border border-charcoal/15 px-3 py-3" placeholder="Name" value={employeeDraft.name} onChange={(event) => setEmployeeDraft({ ...employeeDraft, name: event.target.value })} required />
        <input className="rounded-md border border-charcoal/15 px-3 py-3" type="email" placeholder="Email optional" value={employeeDraft.email} onChange={(event) => setEmployeeDraft({ ...employeeDraft, email: event.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-md border border-charcoal/15 px-3 py-3" placeholder="Position" value={employeeDraft.position} onChange={(event) => setEmployeeDraft({ ...employeeDraft, position: event.target.value })} required />
          <select className="rounded-md border border-charcoal/15 px-3 py-3" value={employeeDraft.role} onChange={(event) => setEmployeeDraft({ ...employeeDraft, role: event.target.value })}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <input className="rounded-md border border-charcoal/15 px-3 py-3" placeholder="One-time passcode" value={employeeDraft.login_code} onChange={(event) => setEmployeeDraft({ ...employeeDraft, login_code: event.target.value })} required />
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-teal px-4 py-3 font-bold text-white"><Plus size={18} /> Add employee</button>
      </form>
      <div className="space-y-2">
        {employees.map((employee) => (
          <div key={employee.id} className={`flex items-center gap-3 rounded-lg bg-paper p-3 shadow-soft ${employee.active ? '' : 'opacity-50'}`}>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-green text-sm font-bold text-white">{initials(employee.name)}</div>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{employee.name}</p>
              <p className="text-sm text-charcoal/65">{employee.position} - {employee.role}</p>
              {employee.must_change_password && <p className="text-xs font-bold text-gold">One-time passcode required</p>}
            </div>
            <button className="rounded-md bg-teal/10 px-3 py-2 text-sm font-bold text-teal" onClick={() => onResetCode(employee)}>Passcode</button>
            {employee.role !== 'manager' && <button className="rounded-md bg-orange/10 p-2 text-orange" onClick={() => onRemove(employee.id)} aria-label={`Deactivate ${employee.name}`}><Trash2 size={18} /></button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleBuilder(props) {
  const { employees, shifts, weekDays, weekOffset, setWeekOffset, shiftDraft, setShiftDraft, editingShiftId, onSave, onEdit, onDelete } = props;
  return (
    <div className="space-y-4">
      <WeekControls weekDays={weekDays} weekOffset={weekOffset} setWeekOffset={setWeekOffset} />
      <form className="grid gap-2 rounded-lg bg-paper p-3 shadow-soft" onSubmit={onSave}>
        <SectionTitle icon={Clock} title={editingShiftId ? 'Edit shift' : 'Create shift'} />
        <select className="rounded-md border border-charcoal/15 px-3 py-3" value={shiftDraft.employee_id} onChange={(event) => setShiftDraft({ ...shiftDraft, employee_id: event.target.value })} required>
          <option value="">Assign employee</option>
          {employees.filter((employee) => employee.active && employee.role === 'employee').map((employee) => <option key={employee.id} value={employee.id}>{employee.name} - {employee.position}</option>)}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <input className="rounded-md border border-charcoal/15 px-3 py-3" type="date" value={shiftDraft.date} onChange={(event) => setShiftDraft({ ...shiftDraft, date: event.target.value })} required />
          <input className="rounded-md border border-charcoal/15 px-3 py-3" type="time" value={shiftDraft.start_time} onChange={(event) => setShiftDraft({ ...shiftDraft, start_time: event.target.value })} required />
          <input className="rounded-md border border-charcoal/15 px-3 py-3" type="time" value={shiftDraft.end_time} onChange={(event) => setShiftDraft({ ...shiftDraft, end_time: event.target.value })} required />
        </div>
        <input className="rounded-md border border-charcoal/15 px-3 py-3" placeholder="Station" value={shiftDraft.station} onChange={(event) => setShiftDraft({ ...shiftDraft, station: event.target.value })} required />
        <textarea className="min-h-20 rounded-md border border-charcoal/15 px-3 py-3" placeholder="Notes" value={shiftDraft.notes} onChange={(event) => setShiftDraft({ ...shiftDraft, notes: event.target.value })} />
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-green px-4 py-3 font-bold text-white"><Check size={18} /> {editingShiftId ? 'Save shift' : 'Create shift'}</button>
      </form>
      <ScheduleList employees={employees} shifts={shifts} weekDays={weekDays} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

function EmployeeSchedule({ currentUser, employees, shifts, myShifts, weekDays, weekOffset, setWeekOffset, coverageDraft, setCoverageDraft, onCoverageSubmit }) {
  const eligible = employees.filter((employee) => employee.role === 'employee' && employee.active && employee.id !== currentUser.id);
  return (
    <div className="space-y-4">
      <WeekControls weekDays={weekDays} weekOffset={weekOffset} setWeekOffset={setWeekOffset} />
      <SectionTitle icon={UserRound} title="My schedule" />
      <ScheduleList employees={employees} shifts={myShifts} weekDays={weekDays} />
      <form className="grid gap-2 rounded-lg bg-paper p-3 shadow-soft" onSubmit={onCoverageSubmit}>
        <SectionTitle icon={Send} title="Request coverage" />
        <select className="rounded-md border border-charcoal/15 px-3 py-3" value={coverageDraft.shift_id} onChange={(event) => setCoverageDraft({ ...coverageDraft, shift_id: event.target.value })} required>
          <option value="">Select your shift</option>
          {myShifts.map((shift) => <option key={shift.id} value={shift.id}>{formatDate(shift.date)} {shift.start_time}-{shift.end_time} {shift.station}</option>)}
        </select>
        <select className="rounded-md border border-charcoal/15 px-3 py-3" value={coverageDraft.target_employee_id} onChange={(event) => setCoverageDraft({ ...coverageDraft, target_employee_id: event.target.value })}>
          <option value="all">Send to all eligible employees</option>
          {eligible.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
        </select>
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-3 font-bold text-charcoal"><Send size={18} /> Request coverage</button>
      </form>
    </div>
  );
}

function TeamSchedule({ employees, shifts, weekDays }) {
  return (
    <div className="space-y-4">
      <SectionTitle icon={UsersRound} title="Full team schedule" />
      <ScheduleList employees={employees} shifts={shifts} weekDays={weekDays} />
    </div>
  );
}

function RequestsPanel({ currentUser, employees, shifts, timeOffRequests, coverageRequests, timeOffDraft, setTimeOffDraft, onTimeOffSubmit, onAcceptCoverage }) {
  const openCoverage = coverageRequests.filter((request) => request.status === 'Pending' && !request.accepted_by_id && request.requester_id !== currentUser.id && (!request.target_employee_id || request.target_employee_id === currentUser.id));
  const myRequests = [...timeOffRequests.filter((request) => request.employee_id === currentUser.id), ...coverageRequests.filter((request) => request.requester_id === currentUser.id || request.accepted_by_id === currentUser.id)];
  return (
    <div className="space-y-4">
      <form className="grid gap-2 rounded-lg bg-paper p-3 shadow-soft" onSubmit={onTimeOffSubmit}>
        <SectionTitle icon={CalendarDays} title="Request day off" />
        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-md border border-charcoal/15 px-3 py-3" type="date" value={timeOffDraft.start_date} onChange={(event) => setTimeOffDraft({ ...timeOffDraft, start_date: event.target.value })} required />
          <input className="rounded-md border border-charcoal/15 px-3 py-3" type="date" value={timeOffDraft.end_date} onChange={(event) => setTimeOffDraft({ ...timeOffDraft, end_date: event.target.value })} required />
        </div>
        <textarea className="min-h-20 rounded-md border border-charcoal/15 px-3 py-3" placeholder="Reason" value={timeOffDraft.reason} onChange={(event) => setTimeOffDraft({ ...timeOffDraft, reason: event.target.value })} required />
        <button className="rounded-md bg-teal px-4 py-3 font-bold text-white">Send request</button>
      </form>
      <SectionTitle icon={Send} title="Coverage available" />
      <div className="space-y-2">
        {openCoverage.map((request) => {
          const shift = shifts.find((item) => item.id === request.shift_id);
          return (
            <div key={request.id} className="rounded-lg bg-paper p-3 shadow-soft">
              <p className="font-bold">{nameFor(employees, request.requester_id)} needs coverage</p>
              <p className="text-sm text-charcoal/65">{shift ? `${formatDate(shift.date)} ${shift.start_time}-${shift.end_time} ${shift.station}` : 'Shift unavailable'}</p>
              <button className="mt-3 rounded-md bg-green px-4 py-2 font-bold text-white" onClick={() => onAcceptCoverage(request.id)}>Accept</button>
            </div>
          );
        })}
        {openCoverage.length === 0 && <EmptyState text="No open coverage requests." />}
      </div>
      <SectionTitle icon={Clock} title="My request status" />
      <div className="space-y-2">
        {myRequests.map((request) => (
          <div key={request.id} className="rounded-lg bg-paper p-3 shadow-soft">
            <StatusBadge status={request.status} />
            <p className="mt-2 text-sm text-charcoal/70">{request.start_date ? `${formatDate(request.start_date)} to ${formatDate(request.end_date)}` : `Coverage for ${formatDate(shifts.find((shift) => shift.id === request.shift_id)?.date)}`}</p>
          </div>
        ))}
        {myRequests.length === 0 && <EmptyState text="No requests yet." />}
      </div>
    </div>
  );
}

function NotificationsPanel({ notifications, onRead }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle icon={Bell} title="Notifications" />
        <button className="rounded-md bg-charcoal px-3 py-2 text-sm font-bold text-cream" onClick={onRead}>Mark read</button>
      </div>
      <div className="space-y-2">
        {notifications.map((note) => (
          <div key={note.id} className={`rounded-lg p-3 shadow-soft ${note.read ? 'bg-paper' : 'bg-teal text-white'}`}>
            <p className="font-bold">{note.title}</p>
            <p className={note.read ? 'text-sm text-charcoal/65' : 'text-sm text-white/80'}>{note.body}</p>
          </div>
        ))}
        {notifications.length === 0 && <EmptyState text="No notifications." />}
      </div>
    </div>
  );
}

function ScheduleList({ employees, shifts, weekDays, onEdit, onDelete }) {
  return (
    <div className="space-y-2">
      {weekDays.map((day) => {
        const dayShifts = shifts.filter((shift) => shift.date === day.iso);
        return (
          <section key={day.iso} className="rounded-lg bg-paper p-3 shadow-soft">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-bold">{dayNames[day.date.getDay()]} <span className="text-charcoal/55">{formatDate(day.iso)}</span></p>
              <span className="rounded-full bg-cream px-2 py-1 text-xs font-bold text-charcoal/65">{dayShifts.length} shifts</span>
            </div>
            <div className="space-y-2">
              {dayShifts.map((shift) => (
                <div key={shift.id} className="rounded-md border border-charcoal/10 bg-white p-3">
                  <div className="flex gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal text-sm font-bold text-white">{initials(nameFor(employees, shift.employee_id))}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{nameFor(employees, shift.employee_id)}</p>
                      <p className="text-sm text-charcoal/65">{shift.start_time}-{shift.end_time} - {shift.station}</p>
                      {shift.notes && <p className="mt-1 text-sm text-charcoal/55">{shift.notes}</p>}
                    </div>
                    {onEdit && (
                      <div className="flex gap-1">
                        <button className="h-9 rounded-md bg-gold/15 px-3 text-sm font-bold text-charcoal" onClick={() => onEdit(shift)}>Edit</button>
                        <button className="grid h-9 w-9 place-items-center rounded-md bg-orange/10 text-orange" onClick={() => onDelete(shift.id)} aria-label="Delete shift"><Trash2 size={17} /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {dayShifts.length === 0 && <p className="rounded-md bg-cream p-3 text-sm text-charcoal/55">No shifts scheduled.</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ApprovalItem({ title, detail, onApprove, onDeny, disabled }) {
  return (
    <div className="rounded-md bg-white/10 p-3">
      <p className="font-bold">{title}</p>
      <p className="text-sm text-cream/70">{detail}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-green px-3 py-2 font-bold text-white disabled:opacity-40" disabled={disabled} onClick={onApprove}><Check size={17} /> Approve</button>
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-orange px-3 py-2 font-bold text-white" onClick={onDeny}><X size={17} /> Deny</button>
      </div>
    </div>
  );
}

function WeekControls({ weekDays, weekOffset, setWeekOffset }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-charcoal p-3 text-cream shadow-soft">
      <button className="rounded-md bg-white/10 p-2" onClick={() => setWeekOffset(weekOffset - 1)} aria-label="Previous week"><ChevronLeft size={19} /></button>
      <p className="text-center text-sm font-bold">{formatDate(weekDays[0].iso)} - {formatDate(weekDays[6].iso)}</p>
      <button className="rounded-md bg-white/10 p-2" onClick={() => setWeekOffset(weekOffset + 1)} aria-label="Next week"><ChevronRight size={19} /></button>
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-xs font-bold ${active ? 'bg-teal text-white' : 'text-charcoal/65'}`} onClick={onClick}>
      <Icon size={19} />
      <span>{label}</span>
    </button>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-paper p-3 shadow-soft">
      <p className="text-2xl font-black text-charcoal">{value}</p>
      <p className="text-sm font-semibold text-charcoal/60">{label}</p>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, light }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <Icon className={light ? 'text-gold' : 'text-teal'} size={19} />
      <h2 className={`text-base font-black ${light ? 'text-cream' : 'text-charcoal'}`}>{title}</h2>
    </div>
  );
}

function StatusBadge({ status }) {
  const classes = {
    Pending: 'bg-gold/20 text-charcoal',
    Approved: 'bg-green/15 text-green',
    Denied: 'bg-orange/15 text-orange',
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${classes[status]}`}>{status}</span>;
}

function EmptyState({ text }) {
  return <p className="rounded-lg bg-paper p-4 text-sm text-charcoal/60 shadow-soft">{text}</p>;
}

function showActionError(error) {
  console.error('Supabase action failed.', error);
  window.alert(error.message || 'The action could not be saved to Supabase.');
}

async function sendEmployeeInvite(employee, loginCode) {
  const { error } = await supabase.functions.invoke('send-employee-invite', {
    body: {
      email: employee.email,
      name: employee.name,
      loginCode,
      appUrl: window.location.origin,
    },
  });

  if (error) {
    console.warn('Invite email failed.', error);
    window.alert(`Employee saved, but the invite email could not be sent. Give ${employee.name} this temporary code: ${loginCode}`);
    return;
  }

  window.alert(`Employee saved. Invite email sent to ${employee.email}.`);
}

function generateLoginCode() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const code = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `SWG-${code}`;
}

function buildEmployeeLoginEmail(name, employees) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '') || 'employee';
  const existingEmails = new Set(employees.map((employee) => employee.email.toLowerCase()));
  let candidate = `${base}@sweetwater.local`;
  let suffix = 2;

  while (existingEmails.has(candidate)) {
    candidate = `${base}.${suffix}@sweetwater.local`;
    suffix += 1;
  }

  return candidate;
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function loadFromSupabase() {
  const [employeesResult, shiftsResult, timeOffResult, coverageResult, notificationsResult] = await Promise.all([
    supabase.from('employees').select('*').order('name'),
    supabase.from('shifts').select('*').order('date'),
    supabase.from('time_off_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('coverage_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }),
  ]);

  const error = employeesResult.error || shiftsResult.error || timeOffResult.error || coverageResult.error || notificationsResult.error;
  if (error) throw error;

  return {
    employees: employeesResult.data || [],
    shifts: shiftsResult.data || [],
    timeOffRequests: timeOffResult.data || [],
    coverageRequests: coverageResult.data || [],
    notifications: notificationsResult.data || [],
  };
}

function getWeekDays(offset) {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay() + offset * 7);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);
    return { date, iso: toIsoDate(date) };
  });
}

function sortShifts(a, b) {
  return `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`);
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return 'Unscheduled';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(year, month - 1, day));
}

function nameFor(employees, id) {
  return employees.find((employee) => employee.id === id)?.name || 'Unassigned';
}

function initials(name) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

export default App;
